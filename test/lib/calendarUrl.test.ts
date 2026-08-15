import { describe, expect, it } from "vitest";
import { publicCalendarUrl } from "@/lib/calendarUrl";

describe("publicCalendarUrl", () => {
  it("builds a stable place calendar path", () => {
    expect(publicCalendarUrl("place_abc", "https://example.com/")).toBe(
      "https://example.com/places/place_abc/calendar",
    );
  });
});
