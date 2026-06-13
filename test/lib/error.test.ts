import { NextResponse } from "next/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/log", () => ({
  log: {
    error: vi.fn(),
    warn: vi.fn(),
    info: vi.fn(),
    breadcrumb: vi.fn(),
  },
}));

import {
  BadRequestError,
  ConflictError,
  ForbiddenError,
  HttpError,
  NotFoundError,
  UnauthorizedError,
  errorMiddleware,
} from "@/lib/error";

function makeRequest(url = "https://example.com/api/test", init?: RequestInit) {
  return new Request(url, init);
}

describe("HttpError subclasses", () => {
  it("HttpError carries status, message, code, details", () => {
    const err = new HttpError(418, "I'm a teapot", {
      code: "TEAPOT",
      details: { brewing: true },
    });
    expect(err.status).toBe(418);
    expect(err.message).toBe("I'm a teapot");
    expect(err.code).toBe("TEAPOT");
    expect(err.details).toEqual({ brewing: true });
    expect(err.name).toBe("HttpError");
  });

  it.each([
    [BadRequestError, 400, "Bad request"],
    [UnauthorizedError, 401, "Unauthorized"],
    [ForbiddenError, 403, "Forbidden"],
    [NotFoundError, 404, "Not found"],
    [ConflictError, 409, "Conflict"],
  ] as const)("%s defaults to %i %s", (Cls, status, message) => {
    const err = new Cls();
    expect(err.status).toBe(status);
    expect(err.message).toBe(message);
  });
});

describe("errorMiddleware", () => {
  it("translates HttpError to a JSON response with the right status", async () => {
    const handler = errorMiddleware(async () => {
      throw new NotFoundError("nope", {
        code: "PLACE_NOT_FOUND",
        details: { id: "abc" },
      });
    });
    const res = await handler(makeRequest(), { params: {} });
    expect(res.status).toBe(404);
    const body = await res.json();
    expect(body).toEqual({
      error: "nope",
      code: "PLACE_NOT_FOUND",
      details: { id: "abc" },
    });
  });

  it("translates an unknown error to 500", async () => {
    const handler = errorMiddleware(async () => {
      throw new Error("boom");
    });
    const res = await handler(makeRequest(), { params: {} });
    expect(res.status).toBe(500);
    const body = await res.json();
    expect(body.error).toBe("boom");
  });

  it("returns 200 { ok: true } for handlers that resolve undefined", async () => {
    const handler = errorMiddleware(async () => undefined);
    const res = await handler(makeRequest(), { params: {} });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ ok: true });
  });

  it("wraps a plain object return into a 200 JSON response", async () => {
    const handler = errorMiddleware(async () => ({ hello: "world" }));
    const res = await handler(makeRequest(), { params: {} });
    expect(res.status).toBe(200);
    expect(await res.json()).toEqual({ hello: "world" });
  });

  it("passes a NextResponse through unchanged", async () => {
    const handler = errorMiddleware(async () =>
      NextResponse.json({ created: true }, { status: 201 }),
    );
    const res = await handler(makeRequest(), { params: {} });
    expect(res.status).toBe(201);
    expect(await res.json()).toEqual({ created: true });
  });
});
