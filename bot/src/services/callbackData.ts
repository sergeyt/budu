import { loadConfig } from "@/config.ts";

/**
 * Telegram limits inline-keyboard callback_data to 64 bytes. We pack an
 * action verb + eventId + a short truncated HMAC so taps from a long-lived
 * channel message can't be forged to target arbitrary events.
 *
 * Wire format: `v1|<action>|<eventId>|<sig>` where:
 *   - action ∈ {reg, can, wai, list}  (reg=register, can=cancel,
 *                                wai=join-waitlist, list=full list DM)
 *   - eventId is a cuid (25 chars)
 *   - sig is the first 10 base64url chars of HMAC-SHA256("<action>|<eventId>")
 *
 * Total: 4 + 3 + 1 + 25 + 1 + 10 = 44 chars. Comfortably under 64 bytes.
 *
 * The `v1` prefix lets us roll the format later (rotate secret, change
 * encoding) without breaking old messages still in chats — handlers can
 * skip unknown versions cleanly.
 */

export type Action = "reg" | "can" | "wai" | "list";

const VERSION = "v1";
const SIG_CHARS = 10;
const encoder = new TextEncoder();

let keyPromise: Promise<CryptoKey> | undefined;
function getKey(): Promise<CryptoKey> {
  if (!keyPromise) {
    keyPromise = crypto.subtle.importKey(
      "raw",
      encoder.encode(loadConfig().TELEGRAM_LINK_SECRET),
      { name: "HMAC", hash: "SHA-256" },
      false,
      ["sign", "verify"],
    );
  }
  return keyPromise;
}

function b64url(bytes: Uint8Array): string {
  let bin = "";
  for (const b of bytes) bin += String.fromCharCode(b);
  return btoa(bin).replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/g, "");
}

function toArrayBufferBytes(src: Uint8Array): Uint8Array<ArrayBuffer> {
  const out = new Uint8Array(new ArrayBuffer(src.byteLength));
  out.set(src);
  return out;
}

async function sign(payload: string): Promise<string> {
  const data = toArrayBufferBytes(encoder.encode(payload));
  const sigBuf = await crypto.subtle.sign("HMAC", await getKey(), data);
  return b64url(new Uint8Array(sigBuf)).slice(0, SIG_CHARS);
}

function timingSafeEqualStr(a: string, b: string): boolean {
  if (a.length !== b.length) return false;
  let diff = 0;
  for (let i = 0; i < a.length; i++) diff |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return diff === 0;
}

export async function encodeCallbackData(
  action: Action,
  eventId: string,
): Promise<string> {
  const payload = `${action}|${eventId}`;
  const sig = await sign(payload);
  const out = `${VERSION}|${payload}|${sig}`;
  if (out.length > 64) {
    throw new Error(
      `callback_data too long (${out.length} > 64); eventId=${eventId}`,
    );
  }
  return out;
}

export type DecodedCallback =
  | { ok: true; action: Action; eventId: string }
  | { ok: false; error: string };

export async function decodeCallbackData(
  data: string,
): Promise<DecodedCallback> {
  const parts = data.split("|");
  if (parts.length !== 4) return { ok: false, error: "malformed" };
  const [version, action, eventId, sig] = parts;
  if (version !== VERSION) return { ok: false, error: "unsupported version" };
  if (
    action !== "reg" && action !== "can" && action !== "wai" &&
    action !== "list"
  ) {
    return { ok: false, error: "unknown action" };
  }
  if (!eventId) return { ok: false, error: "missing eventId" };
  const expected = await sign(`${action}|${eventId}`);
  if (!timingSafeEqualStr(sig, expected)) {
    return { ok: false, error: "bad signature" };
  }
  return { ok: true, action, eventId };
}
