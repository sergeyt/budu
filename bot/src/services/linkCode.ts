import { loadConfig } from "@/config.ts";

/**
 * Port of lib/telegramLinkCode.ts using Web Crypto. Codes minted by the
 * Next app verify here as long as TELEGRAM_LINK_SECRET matches.
 *
 * Format: `<base64url(payload)>.<base64url(HMAC-SHA256(payload))>` where
 * payload is `{"placeId":"...","exp":<unix-seconds>}`.
 */

const encoder = new TextEncoder();
const decoder = new TextDecoder();

let keyPromise: Promise<CryptoKey> | undefined;

function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    const secret = loadConfig().TELEGRAM_LINK_SECRET;
    keyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(secret),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return keyPromise;
}

type Bytes = Uint8Array<ArrayBuffer>;

function copyBytes(src: ArrayBuffer | Uint8Array): Bytes {
  // Always return a Uint8Array whose backing buffer is a fresh ArrayBuffer
  // (not SharedArrayBuffer). Web Crypto wants `BufferSource` which in
  // strict TS narrows to ArrayBuffer-backed views only.
  const buf = src instanceof ArrayBuffer ? src : src.buffer;
  const len = src instanceof ArrayBuffer ? src.byteLength : src.byteLength;
  const out = new Uint8Array(new ArrayBuffer(len));
  out.set(
    new Uint8Array(buf, src instanceof ArrayBuffer ? 0 : src.byteOffset, len),
  );
  return out;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function fromB64url(s: string): Bytes {
  let padded = s.replace(/-/g, "+").replace(/_/g, "/");
  while (padded.length % 4) padded += "=";
  const bin = atob(padded);
  const out = new Uint8Array(new ArrayBuffer(bin.length));
  for (let i = 0; i < bin.length; i++) out[i] = bin.charCodeAt(i);
  return out;
}

function timingSafeEqual(a: Uint8Array, b: Uint8Array): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a[i] ^ b[i];
  return diff === 0;
}

export async function createLinkCode(
  placeId: string,
  ttlSeconds: number = 15 * 60,
): Promise<string> {
  const exp = Math.floor(Date.now() / 1000) + ttlSeconds;
  const payload = copyBytes(encoder.encode(JSON.stringify({ placeId, exp })));
  const sig = copyBytes(
    await crypto.subtle.sign("HMAC", await getKey(), payload),
  );
  return `${b64url(payload)}.${b64url(sig)}`;
}

export type LinkVerifyResult =
  | { ok: true; placeId: string }
  | { ok: false; error: string };

export async function verifyLinkCode(code: string): Promise<LinkVerifyResult> {
  const [p64, s64] = code.split(".");
  if (!p64 || !s64) return { ok: false, error: "Malformed code" };

  let payload: Bytes;
  let sig: Bytes;
  try {
    payload = fromB64url(p64);
    sig = fromB64url(s64);
  } catch {
    return { ok: false, error: "Malformed code" };
  }

  const expected = copyBytes(
    await crypto.subtle.sign("HMAC", await getKey(), payload),
  );
  if (!timingSafeEqual(sig, expected)) {
    return { ok: false, error: "Bad signature" };
  }

  let parsed: { placeId?: unknown; exp?: unknown };
  try {
    parsed = JSON.parse(decoder.decode(payload));
  } catch {
    return { ok: false, error: "Invalid payload" };
  }
  const placeId = typeof parsed.placeId === "string" ? parsed.placeId : null;
  const exp = typeof parsed.exp === "number" ? parsed.exp : null;
  if (!placeId || !exp) return { ok: false, error: "Invalid payload" };
  if (exp < Math.floor(Date.now() / 1000)) {
    return { ok: false, error: "Code expired" };
  }
  return { ok: true, placeId };
}
