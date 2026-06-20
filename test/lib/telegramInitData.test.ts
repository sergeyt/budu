import { describe, expect, it } from "vitest";
import { verifyTelegramInitData } from "@/lib/telegramInitData";

describe("verifyTelegramInitData", () => {
  it("rejects empty or malformed input", () => {
    expect(verifyTelegramInitData("", "token")).toBeNull();
    expect(verifyTelegramInitData("foo=bar", "token")).toBeNull();
  });

  it("rejects expired auth_date", () => {
    const old = Math.floor(Date.now() / 1000) - 25 * 60 * 60;
    expect(
      verifyTelegramInitData(`auth_date=${old}&hash=abc`, "token", old + 1),
    ).toBeNull();
  });
});
