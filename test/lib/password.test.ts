import { describe, expect, it } from "vitest";
import { hashPassword, verifyPassword } from "@/lib/password";

describe("hashPassword / verifyPassword", () => {
  it("round-trips a password", async () => {
    const stored = await hashPassword("testuser");
    expect(await verifyPassword("testuser", stored)).toBe(true);
  });

  it("rejects the wrong password", async () => {
    const stored = await hashPassword("testuser");
    expect(await verifyPassword("wrong", stored)).toBe(false);
  });

  it("returns false for a missing or empty hash without throwing", async () => {
    await expect(verifyPassword("testuser", null)).resolves.toBe(false);
    await expect(verifyPassword("testuser", undefined)).resolves.toBe(false);
    await expect(verifyPassword("testuser", "")).resolves.toBe(false);
  });

  it("returns false for a malformed hash", async () => {
    await expect(verifyPassword("testuser", "not-a-hash")).resolves.toBe(false);
    await expect(verifyPassword("testuser", ":")).resolves.toBe(false);
  });
});
