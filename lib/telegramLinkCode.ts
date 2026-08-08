import crypto from "node:crypto";

const SECRET = process.env.TELEGRAM_LINK_SECRET ?? "dev-only-secret";

function b64url(buf: Buffer) {
  return buf
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/g, "");
}

function fromB64url(s: string) {
  s = s.replace(/-/g, "+").replace(/_/g, "/");
  while (s.length % 4) {
    s += "=";
  }
  return Buffer.from(s, "base64");
}

function signPayload(payload: object): string {
  const p = Buffer.from(JSON.stringify(payload));
  const sig = crypto.createHmac("sha256", SECRET).update(p).digest();
  return `${b64url(p)}.${b64url(sig)}`;
}

function verifySignedPayload(
  code: string,
): { ok: true; payload: unknown } | { ok: false; error: string } {
  const [p64, s64] = code.split(".");
  if (!p64 || !s64) {
    return { ok: false, error: "Malformed code" };
  }
  let payloadBuf: Buffer;
  let sigBuf: Buffer;
  try {
    payloadBuf = fromB64url(p64);
    sigBuf = fromB64url(s64);
  } catch {
    return { ok: false, error: "Malformed code" };
  }
  const expected = crypto
    .createHmac("sha256", SECRET)
    .update(payloadBuf)
    .digest();
  if (
    sigBuf.length !== expected.length ||
    !crypto.timingSafeEqual(sigBuf, expected)
  ) {
    return { ok: false, error: "Bad signature" };
  }
  let payload: unknown;
  try {
    payload = JSON.parse(payloadBuf.toString("utf8"));
  } catch {
    return { ok: false, error: "Invalid payload" };
  }
  return { ok: true, payload };
}

function readExp(payload: Record<string, unknown>): number | null {
  return typeof payload.exp === "number" ? payload.exp : null;
}

export function createLinkCode(placeId: string, ttlSeconds: number = 15 * 60) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return signPayload({ placeId, exp });
}

export function verifyLinkCode(
  code: string,
): { ok: true; placeId: string } | { ok: false; error: string } {
  const verified = verifySignedPayload(code);
  if (!verified.ok) {
    return verified;
  }
  if (typeof verified.payload !== "object" || verified.payload === null) {
    return { ok: false, error: "Invalid payload" };
  }
  const payload = verified.payload as Record<string, unknown>;
  if (payload.kind === "user" || payload.kind === "web_login") {
    return { ok: false, error: "Invalid payload" };
  }
  const placeId = typeof payload.placeId === "string" ? payload.placeId : null;
  const exp = readExp(payload);
  if (!placeId || !exp) {
    return { ok: false, error: "Invalid payload" };
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Code expired" };
  }
  return { ok: true, placeId };
}

/** Short-lived code binding a signed-in Budu user for `/link_account`. */
export function createUserLinkCode(
  userId: string,
  ttlSeconds: number = 15 * 60,
) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return signPayload({ kind: "user", userId, exp });
}

export function verifyUserLinkCode(
  code: string,
): { ok: true; userId: string } | { ok: false; error: string } {
  const verified = verifySignedPayload(code);
  if (!verified.ok) {
    return verified;
  }
  if (typeof verified.payload !== "object" || verified.payload === null) {
    return { ok: false, error: "Invalid payload" };
  }
  const payload = verified.payload as Record<string, unknown>;
  if (payload.kind !== "user") {
    return { ok: false, error: "Invalid payload" };
  }
  const userId = typeof payload.userId === "string" ? payload.userId : null;
  const exp = readExp(payload);
  if (!userId || !exp) {
    return { ok: false, error: "Invalid payload" };
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Code expired" };
  }
  return { ok: true, userId };
}

/** Short-lived magic-link token for web sign-in via the Telegram bot. */
export function createWebLoginToken(
  userId: string,
  ttlSeconds: number = 5 * 60,
) {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  return signPayload({ kind: "web_login", userId, exp });
}

export function verifyWebLoginToken(
  token: string,
): { ok: true; userId: string } | { ok: false; error: string } {
  const verified = verifySignedPayload(token);
  if (!verified.ok) {
    return verified;
  }
  if (typeof verified.payload !== "object" || verified.payload === null) {
    return { ok: false, error: "Invalid payload" };
  }
  const payload = verified.payload as Record<string, unknown>;
  if (payload.kind !== "web_login") {
    return { ok: false, error: "Invalid payload" };
  }
  const userId = typeof payload.userId === "string" ? payload.userId : null;
  const exp = readExp(payload);
  if (!userId || !exp) {
    return { ok: false, error: "Invalid payload" };
  }
  if (exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Code expired" };
  }
  return { ok: true, userId };
}
