import { NextRequest } from "next/server";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { POST as passwordLoginPOST } from "@/app/api/auth/password-login/route";
import { hashPassword } from "@/lib/password";
import { prisma } from "../helpers/db";
import { makeUser } from "../helpers/factories";

function postJson(body: unknown) {
  const req = new NextRequest("http://localhost/api/auth/password-login", {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  return passwordLoginPOST(req);
}

function postForm(username: string, password: string) {
  const req = new NextRequest("http://localhost/api/auth/password-login", {
    method: "POST",
    headers: { "content-type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ username, password }).toString(),
  });
  return passwordLoginPOST(req);
}

function locationOf(res: Response): URL {
  const loc = res.headers.get("location");
  expect(loc).toBeTruthy();
  return new URL(loc as string, "http://localhost");
}

describe("POST /api/auth/password-login", () => {
  beforeEach(() => {
    vi.stubEnv("AUTH_PASSWORD_LOGIN", "1");
    vi.stubEnv("AUTH_URL", "http://localhost:3000");
  });

  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("returns 404 when AUTH_PASSWORD_LOGIN is unset", async () => {
    vi.stubEnv("AUTH_PASSWORD_LOGIN", "");
    const res = await postJson({ username: "testuser", password: "testuser" });
    expect(res.status).toBe(404);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("NOT_FOUND");
    expect(await prisma.session.count()).toBe(0);
  });

  it("returns 400 INVALID_PAYLOAD for a missing password", async () => {
    const res = await postJson({ username: "testuser" });
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("INVALID_PAYLOAD");
  });

  it("returns 400 INVALID_PAYLOAD when content-type is missing", async () => {
    const req = new NextRequest("http://localhost/api/auth/password-login", {
      method: "POST",
      body: JSON.stringify({ username: "testuser", password: "testuser" }),
    });
    const res = await passwordLoginPOST(req);
    expect(res.status).toBe(400);
    const body = (await res.json()) as { code: string };
    expect(body.code).toBe("INVALID_PAYLOAD");
  });

  it("redirects with invalid_credentials for an unknown username", async () => {
    const res = await postJson({ username: "nobody", password: "testuser" });
    expect(res.status).toBe(303);
    const loc = locationOf(res);
    expect(loc.pathname).toBe("/");
    expect(loc.searchParams.get("loginError")).toBe("invalid_credentials");
    expect(await prisma.session.count()).toBe(0);
  });

  it("redirects with invalid_credentials for the wrong password", async () => {
    await makeUser({
      username: "testuser",
      passwordHash: await hashPassword("testuser"),
    });
    const res = await postJson({ username: "testuser", password: "wrong" });
    expect(res.status).toBe(303);
    expect(locationOf(res).searchParams.get("loginError")).toBe(
      "invalid_credentials",
    );
    expect(await prisma.session.count()).toBe(0);
  });

  it("redirects with invalid_credentials when the user has no password hash", async () => {
    await makeUser({ username: "testuser" });
    const res = await postJson({ username: "testuser", password: "testuser" });
    expect(res.status).toBe(303);
    expect(locationOf(res).searchParams.get("loginError")).toBe(
      "invalid_credentials",
    );
    expect(await prisma.session.count()).toBe(0);
  });

  it("creates a database session and sets the Auth.js cookie", async () => {
    const user = await makeUser({
      username: "testuser",
      passwordHash: await hashPassword("testuser"),
    });
    const res = await postJson({ username: "testuser", password: "testuser" });
    expect(res.status).toBe(303);
    const loc = locationOf(res);
    expect(loc.pathname).toBe("/");
    expect(loc.searchParams.get("loginError")).toBeNull();

    const setCookie = res.headers.get("set-cookie") ?? "";
    expect(setCookie).toMatch(/authjs\.session-token=/);
    expect(setCookie).toMatch(/HttpOnly/i);
    expect(setCookie).toMatch(/Path=\//i);
    expect(setCookie).not.toMatch(/Secure/i);

    const session = await prisma.session.findFirst({
      where: { userId: user.id },
    });
    expect(session).not.toBeNull();
    expect(setCookie).toContain(session?.sessionToken);
  });

  it("accepts application/x-www-form-urlencoded from the SignIn form", async () => {
    const user = await makeUser({
      username: "testadmin",
      passwordHash: await hashPassword("testadmin"),
    });
    const res = await postForm("testadmin", "testadmin");
    expect(res.status).toBe(303);
    const session = await prisma.session.findFirst({
      where: { userId: user.id },
    });
    expect(session).not.toBeNull();
  });
});
