import { describe, expect, it } from "vitest";
import {
  dateToLocalTime,
  localTimeToDate,
  nextOccurrencesUtc,
  weekdayName,
} from "@/lib/templates";

describe("dateToLocalTime / localTimeToDate", () => {
  it("round-trips HH:MM via a UTC-epoch Date", () => {
    const cases = ["00:00", "07:05", "12:30", "19:00", "23:59"];
    for (const s of cases) {
      const d = localTimeToDate(s);
      expect(d.getUTCFullYear()).toBe(1970);
      expect(d.getUTCMonth()).toBe(0);
      expect(d.getUTCDate()).toBe(1);
      expect(dateToLocalTime(d)).toBe(s);
    }
  });

  it("accepts HH:MM:SS but drops seconds in the canonical form", () => {
    expect(dateToLocalTime(localTimeToDate("19:00:45"))).toBe("19:00");
  });

  it("rejects bad input with a clear error", () => {
    for (const bad of ["", "19", "19:60", "25:00", "abc", "19:0", "-1:00"]) {
      expect(() => localTimeToDate(bad)).toThrow();
    }
  });
});

describe("weekdayName", () => {
  it("maps ISO 1–7 to Mon..Sun", () => {
    expect(weekdayName(1)).toBe("Mon");
    expect(weekdayName(3)).toBe("Wed");
    expect(weekdayName(7)).toBe("Sun");
  });
  it("rejects out-of-range", () => {
    expect(() => weekdayName(0)).toThrow();
    expect(() => weekdayName(8)).toThrow();
  });
});

describe("nextOccurrencesUtc", () => {
  // Anchor on a fixed Monday 09:00 UTC to make assertions concrete.
  const monday = new Date("2026-06-15T09:00:00.000Z"); // Mon

  it("returns occurrences strictly after fromUtc", () => {
    const out = nextOccurrencesUtc({
      dayOfWeek: 3, // Wed
      localTime: localTimeToDate("19:00"),
      timezone: "Europe/Moscow", // UTC+3, no DST
      fromUtc: monday,
      daysAhead: 8,
    });
    // Wed 17 Jun 2026 19:00 Moscow = 16:00 UTC
    expect(out).toEqual([new Date("2026-06-17T16:00:00.000Z")]);
  });

  it("yields N weekly occurrences across a longer window", () => {
    const out = nextOccurrencesUtc({
      dayOfWeek: 3,
      localTime: localTimeToDate("19:00"),
      timezone: "Europe/Moscow",
      fromUtc: monday,
      daysAhead: 30,
    });
    expect(out.length).toBe(4); // 17, 24 Jun, 1, 8 Jul
    expect(out[0].toISOString()).toBe("2026-06-17T16:00:00.000Z");
    expect(out[1].toISOString()).toBe("2026-06-24T16:00:00.000Z");
    expect(out[2].toISOString()).toBe("2026-07-01T16:00:00.000Z");
    expect(out[3].toISOString()).toBe("2026-07-08T16:00:00.000Z");
  });

  it("skips today when the time has already passed", () => {
    // Wed 17 Jun 2026 at 20:00 Moscow = 17:00 UTC. Template fires at
    // 19:00 Moscow → already past, next instance is +7 days.
    const wedAfter = new Date("2026-06-17T17:00:00.000Z");
    const out = nextOccurrencesUtc({
      dayOfWeek: 3,
      localTime: localTimeToDate("19:00"),
      timezone: "Europe/Moscow",
      fromUtc: wedAfter,
      daysAhead: 8,
    });
    expect(out).toEqual([new Date("2026-06-24T16:00:00.000Z")]);
  });

  it("respects DST: same local clock, different UTC across the boundary", () => {
    // CET → CEST switches on 29 Mar 2026.
    // A weekly Sunday 10:00 template in Europe/Berlin spans the boundary:
    //   22 Mar (CET, UTC+1)            → 10:00 local = 09:00 UTC
    //   29 Mar (CEST, spring-forward)  → 10:00 local = 08:00 UTC
    //   05 Apr (CEST)                  → 10:00 local = 08:00 UTC
    //   12 Apr (CEST)                  → 10:00 local = 08:00 UTC
    const out = nextOccurrencesUtc({
      dayOfWeek: 7,
      localTime: localTimeToDate("10:00"),
      timezone: "Europe/Berlin",
      fromUtc: new Date("2026-03-20T00:00:00.000Z"),
      daysAhead: 25,
    });
    expect(out.map((d) => d.toISOString())).toEqual([
      "2026-03-22T09:00:00.000Z",
      "2026-03-29T08:00:00.000Z",
      "2026-04-05T08:00:00.000Z",
      "2026-04-12T08:00:00.000Z",
    ]);
  });

  it("returns the same weekday hit when fromUtc is earlier in the day", () => {
    // Wed 17 Jun 2026 at 09:00 UTC = 12:00 Moscow → still before 19:00,
    // so today's slot must be the first occurrence. With daysAhead=8 the
    // window also reaches the next Wed (24 Jun).
    const wedMorning = new Date("2026-06-17T09:00:00.000Z");
    const out = nextOccurrencesUtc({
      dayOfWeek: 3,
      localTime: localTimeToDate("19:00"),
      timezone: "Europe/Moscow",
      fromUtc: wedMorning,
      daysAhead: 8,
    });
    expect(out.map((d) => d.toISOString())).toEqual([
      "2026-06-17T16:00:00.000Z",
      "2026-06-24T16:00:00.000Z",
    ]);
  });

  it("is empty when daysAhead is too small to reach the next occurrence", () => {
    const out = nextOccurrencesUtc({
      dayOfWeek: 7, // Sun
      localTime: localTimeToDate("10:00"),
      timezone: "Europe/Moscow",
      fromUtc: monday, // Mon
      daysAhead: 3, // only Mon-Wed
    });
    expect(out).toEqual([]);
  });
});
