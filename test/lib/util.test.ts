import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { canRegisterNow, countBy, isDefined, toDateTime } from "@/lib/util";

describe("isDefined", () => {
  it.each([
    [0, true],
    ["", true],
    [false, true],
    [{}, true],
    [[], true],
    [null, false],
    [undefined, false],
  ])("isDefined(%p) === %p", (input, expected) => {
    expect(isDefined(input)).toBe(expected);
  });
});

describe("toDateTime", () => {
  it("parses a Date", () => {
    const d = new Date("2025-01-02T03:04:05.000Z");
    expect(toDateTime(d).toUTC().toISO()).toBe("2025-01-02T03:04:05.000Z");
  });

  it("parses an ISO string", () => {
    expect(toDateTime("2025-01-02T03:04:05.000Z").toUTC().toISO()).toBe(
      "2025-01-02T03:04:05.000Z",
    );
  });

  it("parses a numeric millis timestamp", () => {
    const ms = Date.UTC(2025, 0, 2, 3, 4, 5);
    expect(toDateTime(ms).toMillis()).toBe(ms);
  });

  it("parses an RFC2822 string", () => {
    const dt = toDateTime("Tue, 15 Nov 2022 12:45:26 GMT");
    expect(dt.isValid).toBe(true);
  });

  it("returns invalid for garbage", () => {
    expect(toDateTime("not a date").isValid).toBe(false);
  });
});

describe("canRegisterNow", () => {
  beforeEach(() => {
    vi.useFakeTimers();
  });
  afterEach(() => {
    vi.useRealTimers();
  });

  const start = new Date("2025-06-01T18:00:00.000Z");

  it("is false more than 24h before start", () => {
    vi.setSystemTime(new Date("2025-05-31T17:59:59.000Z"));
    expect(canRegisterNow(start)).toBe(false);
  });

  it("is true exactly 24h before start (window opens)", () => {
    vi.setSystemTime(new Date("2025-05-31T18:00:00.000Z"));
    expect(canRegisterNow(start)).toBe(true);
  });

  it("is true 1 hour before start", () => {
    vi.setSystemTime(new Date("2025-06-01T17:00:00.000Z"));
    expect(canRegisterNow(start)).toBe(true);
  });

  it("is false at the start instant (window closes)", () => {
    vi.setSystemTime(start);
    expect(canRegisterNow(start)).toBe(false);
  });

  it("is false after the start instant", () => {
    vi.setSystemTime(new Date("2025-06-01T18:00:01.000Z"));
    expect(canRegisterNow(start)).toBe(false);
  });
});

describe("countBy", () => {
  it("counts occurrences by key", () => {
    const items = [
      { status: "CONFIRMED" },
      { status: "CONFIRMED" },
      { status: "RESERVED" },
    ] as const;
    expect(countBy(items, "status")).toEqual({ CONFIRMED: 2, RESERVED: 1 });
  });

  it("seeds counts from the provided init object", () => {
    const items = [{ s: "a" }, { s: "a" }] as const;
    expect(countBy(items, "s", { a: 0, b: 0 })).toEqual({ a: 2, b: 0 });
  });

  it("returns the init object unchanged for an empty input", () => {
    expect(countBy([] as { x: string }[], "x", { foo: 7 })).toEqual({
      foo: 7,
    });
  });
});
