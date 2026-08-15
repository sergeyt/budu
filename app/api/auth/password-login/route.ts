import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { errorMiddleware, errors } from "@/lib/error";
import { PasswordLogin } from "@/lib/validation";
import { verifyPassword } from "@/lib/password";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function passwordLoginEnabled(): boolean {
  return process.env.AUTH_PASSWORD_LOGIN === "1";
}

function secureAuthCookies(): boolean {
  return (process.env.AUTH_URL ?? "").startsWith("https://");
}

function sessionCookieName(): string {
  return `${secureAuthCookies() ? "__Secure-" : ""}authjs.session-token`;
}

function originFrom(req: Request): string {
  return process.env.AUTH_URL?.replace(/\/+$/, "") ?? new URL(req.url).origin;
}

function failureRedirect(origin: string): NextResponse {
  const url = new URL("/", origin);
  url.searchParams.set("loginError", "invalid_credentials");
  return NextResponse.redirect(url, 303);
}

async function readBody(req: Request): Promise<unknown> {
  const contentType = req.headers.get("content-type") ?? "";
  if (contentType.includes("application/json")) {
    try {
      return await req.json();
    } catch {
      throw errors.invalidPayload("password login");
    }
  }
  if (
    contentType.includes("application/x-www-form-urlencoded") ||
    contentType.includes("multipart/form-data")
  ) {
    const form = await req.formData();
    return {
      username: form.get("username"),
      password: form.get("password"),
    };
  }
  throw errors.invalidPayload("password login");
}

/**
 * Test/dev username+password login. Creates an Auth.js database session.
 * Credentials provider is intentionally avoided — it does not create DB sessions.
 * Gated by AUTH_PASSWORD_LOGIN=1; production should leave this unset.
 */
export const POST = errorMiddleware(async (req) => {
  if (!passwordLoginEnabled()) {
    throw errors.notFound();
  }

  const parsed = PasswordLogin.safeParse(await readBody(req));
  if (!parsed.success) {
    throw errors.invalidPayload("password login", parsed.error.flatten());
  }

  const origin = originFrom(req);
  const user = await prisma.user.findUnique({
    where: { username: parsed.data.username },
    select: { id: true, passwordHash: true },
  });
  const ok = await verifyPassword(parsed.data.password, user?.passwordHash);
  if (!user || !ok) {
    return failureRedirect(origin);
  }

  const sessionToken = crypto.randomUUID();
  const expires = new Date(Date.now() + SESSION_MAX_AGE_MS);
  await prisma.session.create({
    data: {
      sessionToken,
      userId: user.id,
      expires,
    },
  });

  const response = NextResponse.redirect(new URL("/", origin), 303);
  response.cookies.set({
    name: sessionCookieName(),
    value: sessionToken,
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    secure: secureAuthCookies(),
    expires,
  });
  return response;
});
