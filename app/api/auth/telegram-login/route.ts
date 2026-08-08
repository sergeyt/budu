import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { verifyWebLoginToken } from "@/lib/telegramLinkCode";

const SESSION_MAX_AGE_MS = 30 * 24 * 60 * 60 * 1000;

function secureAuthCookies(): boolean {
  return (process.env.AUTH_URL ?? "").startsWith("https://");
}

function sessionCookieName(): string {
  return `${secureAuthCookies() ? "__Secure-" : ""}authjs.session-token`;
}

function failureRedirect(origin: string, reason: string): NextResponse {
  const url = new URL("/", origin);
  url.searchParams.set("loginError", reason);
  return NextResponse.redirect(url);
}

/**
 * Consume a bot-minted magic-link token and create an Auth.js database session.
 * Credentials provider is intentionally avoided — it does not create DB sessions.
 */
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const token = searchParams.get("token");
  const origin =
    process.env.AUTH_URL?.replace(/\/+$/, "") ?? new URL(req.url).origin;

  if (!token) {
    return failureRedirect(origin, "missing_token");
  }

  const verified = verifyWebLoginToken(token);
  if (!verified.ok) {
    return failureRedirect(origin, "invalid_token");
  }

  const user = await prisma.user.findUnique({
    where: { id: verified.userId },
    select: { id: true },
  });
  if (!user) {
    return failureRedirect(origin, "user_not_found");
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

  const response = NextResponse.redirect(new URL("/", origin));
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
}
