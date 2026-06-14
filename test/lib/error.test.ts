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
  errors,
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

describe("errors catalog", () => {
  it("every entry produces an HttpError with status, message, and code", () => {
    const factories = Object.values(errors);
    expect(factories.length).toBeGreaterThan(0);
    for (const factory of factories) {
      // Call with up to two placeholder args so parameterized factories
      // (`missingParam`, `invalidPayload`) construct successfully.
      const err = (factory as (...a: unknown[]) => HttpError)("x", {});
      expect(err).toBeInstanceOf(HttpError);
      expect(err.status).toBeGreaterThanOrEqual(400);
      expect(err.status).toBeLessThan(600);
      expect(err.message).toBeTruthy();
      expect(err.code).toMatch(/^[A-Z][A-Z0-9_]+$/);
    }
  });

  it("has a unique code for every entry", () => {
    const codes = Object.values(errors).map(
      (f) => (f as (...a: unknown[]) => HttpError)("x", {}).code,
    );
    expect(new Set(codes).size).toBe(codes.length);
  });

  it("missingParam produces a 400 with the param name interpolated", () => {
    const err = errors.missingParam("eventId");
    expect(err.status).toBe(400);
    expect(err.message).toBe("eventId is required");
    expect(err.code).toBe("MISSING_PARAM");
    expect(err.details).toEqual({ param: "eventId" });
  });

  it("invalidPayload preserves Zod-style details and interpolates resource", () => {
    const err = errors.invalidPayload("place", {
      formErrors: [],
      fieldErrors: { name: ["required"] },
    });
    expect(err.status).toBe(400);
    expect(err.message).toBe("Invalid place payload");
    expect(err.code).toBe("INVALID_PAYLOAD");
    expect(err.details).toEqual({
      formErrors: [],
      fieldErrors: { name: ["required"] },
    });
  });
});
