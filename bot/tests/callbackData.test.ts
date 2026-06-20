import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.0";

Deno.env.set("TELEGRAM_LINK_SECRET", "test-link-secret");
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-0000000000");
Deno.env.set(
  "DATABASE_URL",
  "postgres://test:test@localhost:5432/test",
);
Deno.env.set("TELEGRAM_CALLBACK_SECRET", "test-callback-secret");

const { encodeCallbackData, decodeCallbackData } = await import(
  "../src/services/callbackData.ts"
);

const CUID = "ckxx1234567890abcdefghijk"; // 25-char placeholder

Deno.test("callbackData: round-trip for every action", async () => {
  for (const action of ["reg", "can", "wai", "list"] as const) {
    const data = await encodeCallbackData(action, CUID);
    const decoded = await decodeCallbackData(data);
    assertEquals(decoded, { ok: true, action, eventId: CUID });
  }
});

Deno.test("callbackData: fits inside Telegram's 64-byte limit", async () => {
  const data = await encodeCallbackData("reg", CUID);
  // assertLess would be nicer but @std/assert only exposes assertEquals
  // in the version we depend on; comparing on the boolean is fine.
  assertEquals(data.length <= 64, true, `len=${data.length}`);
});

Deno.test("callbackData: tampered signature is rejected", async () => {
  const data = await encodeCallbackData("reg", CUID);
  const last = data.slice(-1) === "A" ? "B" : "A";
  const tampered = data.slice(0, -1) + last;
  assertNotEquals(tampered, data);
  const decoded = await decodeCallbackData(tampered);
  assertEquals(decoded.ok, false);
});

Deno.test("callbackData: action swap with old signature is rejected", async () => {
  // An attacker who saw a "reg" callback and edits the action to "can"
  // would have the old "reg" signature appended — must not verify.
  const regData = await encodeCallbackData("reg", CUID);
  const parts = regData.split("|");
  parts[1] = "can";
  const tampered = parts.join("|");
  const decoded = await decodeCallbackData(tampered);
  assertEquals(decoded.ok, false);
});

Deno.test("callbackData: malformed input is rejected gracefully", async () => {
  for (const bad of ["", "v1|reg|abc", "v2|reg|abc|xx", "v1|xxx|abc|yy"]) {
    const decoded = await decodeCallbackData(bad);
    assertEquals(decoded.ok, false);
  }
});
