import { describe, expect, it } from "vitest";
import { CancelEvent, UpdateEvent } from "@/lib/validation";

describe("CancelEvent", () => {
  it("requires a non-trivial reason", () => {
    expect(CancelEvent.safeParse({ reason: "ab" }).success).toBe(false);
    expect(CancelEvent.safeParse({ reason: "   " }).success).toBe(false);
    expect(CancelEvent.safeParse({ reason: "Rain at the club" }).success).toBe(
      true,
    );
  });
});

describe("UpdateEvent", () => {
  it("accepts partial description updates", () => {
    const parsed = UpdateEvent.safeParse({
      description: "Bring your own paddle",
    });
    expect(parsed.success).toBe(true);
  });

  it("rejects empty title when provided", () => {
    expect(UpdateEvent.safeParse({ title: "" }).success).toBe(false);
  });
});
