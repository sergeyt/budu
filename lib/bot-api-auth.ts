import { timingSafeEqual } from "node:crypto";
import { errors } from "@/lib/error";

function readToken(req: Request): string | null {
  const auth = req.headers.get("authorization");
  if (auth?.startsWith("Bearer ")) {
    return auth.slice("Bearer ".length).trim();
  }
  const header = req.headers.get("x-bot-internal-token");
  return header?.trim() ?? null;
}

function tokensEqual(expected: string, presented: string): boolean {
  const a = Buffer.from(expected);
  const b = Buffer.from(presented);
  if (a.length !== b.length) {
    return false;
  }
  return timingSafeEqual(a, b);
}

/**
 * Gate `/api/internal/bot/*` routes. The Telegram bot service authenticates
 * with a shared secret — no session cookies, no user OAuth.
 */
export function requireBotInternalToken(req: Request): void {
  const expected = process.env.BOT_INTERNAL_TOKEN;
  if (!expected) {
    throw errors.botApiNotConfigured();
  }
  const presented = readToken(req);
  if (!presented || !tokensEqual(expected, presented)) {
    throw errors.badBotInternalToken();
  }
}
