import { assertEquals, assertNotEquals } from "jsr:@std/assert@^1.0.0";
import { FakeTime } from "jsr:@std/testing@^1.0.0/time";

// The link-code module reads TELEGRAM_LINK_SECRET at first use; set it
// before importing.
Deno.env.set("TELEGRAM_LINK_SECRET", "test-link-secret");
Deno.env.set("TELEGRAM_BOT_TOKEN", "test-token-0000000000");
Deno.env.set("API_BASE_URL", "http://localhost:3000");
Deno.env.set("BOT_INTERNAL_TOKEN", "test-internal-token-00000000");
Deno.env.set("TELEGRAM_CALLBACK_SECRET", "test-callback-secret");

const { createLinkCode, verifyLinkCode } = await import(
  "../src/services/linkCode.ts"
);

Deno.test("linkCode: round-trips placeId", async () => {
  const time = new FakeTime("2025-06-01T12:00:00.000Z");
  try {
    const code = await createLinkCode("place_abc123");
    const result = await verifyLinkCode(code);
    assertEquals(result, { ok: true, placeId: "place_abc123" });
  } finally {
    time.restore();
  }
});

Deno.test("linkCode: malformed code is rejected", async () => {
  assertEquals(await verifyLinkCode("nodot"), {
    ok: false,
    error: "Malformed code",
  });
  assertEquals(await verifyLinkCode("payload."), {
    ok: false,
    error: "Malformed code",
  });
  assertEquals(await verifyLinkCode(".sig"), {
    ok: false,
    error: "Malformed code",
  });
});

Deno.test("linkCode: tampered signature is rejected", async () => {
  const time = new FakeTime("2025-06-01T12:00:00.000Z");
  try {
    const code = await createLinkCode("place_abc123");
    const [payload, sig] = code.split(".");
    const flipped = sig.startsWith("A")
      ? `B${sig.slice(1)}`
      : `A${sig.slice(1)}`;
    assertEquals(await verifyLinkCode(`${payload}.${flipped}`), {
      ok: false,
      error: "Bad signature",
    });
  } finally {
    time.restore();
  }
});

Deno.test("linkCode: tampered payload is rejected", async () => {
  const time = new FakeTime("2025-06-01T12:00:00.000Z");
  try {
    const code = await createLinkCode("place_abc123");
    const [payload, sig] = code.split(".");
    const otherPayload = (await createLinkCode("place_xyz999")).split(".")[0];
    assertNotEquals(otherPayload, payload);
    assertEquals(await verifyLinkCode(`${otherPayload}.${sig}`), {
      ok: false,
      error: "Bad signature",
    });
  } finally {
    time.restore();
  }
});

Deno.test("linkCode: expired code is rejected", async () => {
  const time = new FakeTime("2025-06-01T12:00:00.000Z");
  try {
    const code = await createLinkCode("place_abc123", 60);
    time.now = Date.parse("2025-06-01T12:01:01.000Z");
    assertEquals(await verifyLinkCode(code), {
      ok: false,
      error: "Code expired",
    });
  } finally {
    time.restore();
  }
});

Deno.test("linkCode: accepts code one second before expiry", async () => {
  const time = new FakeTime("2025-06-01T12:00:00.000Z");
  try {
    const code = await createLinkCode("place_abc123", 60);
    time.now = Date.parse("2025-06-01T12:00:59.000Z");
    assertEquals(await verifyLinkCode(code), {
      ok: true,
      placeId: "place_abc123",
    });
  } finally {
    time.restore();
  }
});
