import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { createLinkCode, verifyLinkCode } from "@/lib/telegramLinkCode";

describe("telegramLinkCode", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date("2025-06-01T12:00:00.000Z"));
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  it("round-trips placeId", () => {
    const code = createLinkCode("place_abc123");
    const result = verifyLinkCode(code);
    expect(result).toEqual({ ok: true, placeId: "place_abc123" });
  });

  it("returns malformed error when there is no payload separator", () => {
    expect(verifyLinkCode("nodot")).toEqual({
      ok: false,
      error: "Malformed code",
    });
  });

  it("returns malformed error when one segment is empty", () => {
    expect(verifyLinkCode("payload.")).toEqual({
      ok: false,
      error: "Malformed code",
    });
    expect(verifyLinkCode(".sig")).toEqual({
      ok: false,
      error: "Malformed code",
    });
  });

  it("rejects a tampered signature", () => {
    const code = createLinkCode("place_abc123");
    const [payload, sig] = code.split(".");
    // Flip one character in the signature.
    const flipped = sig.startsWith("A")
      ? `B${sig.slice(1)}`
      : `A${sig.slice(1)}`;
    expect(verifyLinkCode(`${payload}.${flipped}`)).toEqual({
      ok: false,
      error: "Bad signature",
    });
  });

  it("rejects a tampered payload", () => {
    const code = createLinkCode("place_abc123");
    const [payload, sig] = code.split(".");
    // Replacing payload with a different valid base64url payload should
    // fail signature verification (not be silently accepted).
    const otherPayload = createLinkCode("place_xyz999").split(".")[0];
    expect(otherPayload).not.toBe(payload);
    expect(verifyLinkCode(`${otherPayload}.${sig}`)).toEqual({
      ok: false,
      error: "Bad signature",
    });
  });

  it("rejects an expired code", () => {
    const code = createLinkCode("place_abc123", 60);
    vi.setSystemTime(new Date("2025-06-01T12:01:01.000Z"));
    expect(verifyLinkCode(code)).toEqual({
      ok: false,
      error: "Code expired",
    });
  });

  it("accepts a code that is right at the expiry boundary", () => {
    const code = createLinkCode("place_abc123", 60);
    vi.setSystemTime(new Date("2025-06-01T12:00:59.000Z"));
    expect(verifyLinkCode(code)).toEqual({
      ok: true,
      placeId: "place_abc123",
    });
  });
});
