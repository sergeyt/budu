import { assertEquals, assertThrows } from "jsr:@std/assert@^1.0.0";
import {
  dateToLocalTime,
  localTimeToDate,
  nextOccurrencesUtc,
  weekdayName,
} from "../src/services/time.ts";

// Mirror of test/lib/templates.test.ts in the Next app. Keep in sync —
// the materializer and the admin "next N preview" must agree.

Deno.test("localTime round-trips HH:MM via a UTC-epoch Date", () => {
  for (const s of ["00:00", "07:05", "12:30", "19:00", "23:59"]) {
    const d = localTimeToDate(s);
    assertEquals(d.getUTCFullYear(), 1970);
    assertEquals(d.getUTCMonth(), 0);
    assertEquals(d.getUTCDate(), 1);
    assertEquals(dateToLocalTime(d), s);
  }
});

Deno.test("localTime accepts HH:MM:SS, canonicalizes to HH:MM", () => {
  assertEquals(dateToLocalTime(localTimeToDate("19:00:45")), "19:00");
});

Deno.test("localTime rejects bad input", () => {
  for (const bad of ["", "19", "19:60", "25:00", "abc", "19:0", "-1:00"]) {
    assertThrows(() => localTimeToDate(bad));
  }
});

Deno.test("weekdayName maps ISO 1–7 to Mon..Sun", () => {
  assertEquals(weekdayName(1), "Mon");
  assertEquals(weekdayName(3), "Wed");
  assertEquals(weekdayName(7), "Sun");
  assertThrows(() => weekdayName(0));
  assertThrows(() => weekdayName(8));
});

Deno.test("nextOccurrencesUtc: Wednesday 19:00 Moscow from Monday morning", () => {
  const monday = new Date("2026-06-15T09:00:00.000Z");
  const out = nextOccurrencesUtc({
    dayOfWeek: 3,
    localTime: localTimeToDate("19:00"),
    timezone: "Europe/Moscow",
    fromUtc: monday,
    daysAhead: 8,
  });
  assertEquals(
    out.map((d) => d.toISOString()),
    ["2026-06-17T16:00:00.000Z"],
  );
});

Deno.test("nextOccurrencesUtc: weekly cadence across a 30-day window", () => {
  const out = nextOccurrencesUtc({
    dayOfWeek: 3,
    localTime: localTimeToDate("19:00"),
    timezone: "Europe/Moscow",
    fromUtc: new Date("2026-06-15T09:00:00.000Z"),
    daysAhead: 30,
  });
  assertEquals(out.map((d) => d.toISOString()), [
    "2026-06-17T16:00:00.000Z",
    "2026-06-24T16:00:00.000Z",
    "2026-07-01T16:00:00.000Z",
    "2026-07-08T16:00:00.000Z",
  ]);
});

Deno.test("nextOccurrencesUtc: skips today when time has already passed", () => {
  const wedAfter = new Date("2026-06-17T17:00:00.000Z"); // 20:00 Moscow
  const out = nextOccurrencesUtc({
    dayOfWeek: 3,
    localTime: localTimeToDate("19:00"),
    timezone: "Europe/Moscow",
    fromUtc: wedAfter,
    daysAhead: 8,
  });
  assertEquals(
    out.map((d) => d.toISOString()),
    ["2026-06-24T16:00:00.000Z"],
  );
});

Deno.test("nextOccurrencesUtc: DST keeps local clock, shifts UTC", () => {
  // CET → CEST on 29 Mar 2026. Sunday 10:00 Berlin:
  //   22 Mar (CET, UTC+1)  → 09:00 UTC
  //   29 Mar (CEST, UTC+2) → 08:00 UTC
  //   05 Apr (CEST)        → 08:00 UTC
  //   12 Apr (CEST)        → 08:00 UTC
  const out = nextOccurrencesUtc({
    dayOfWeek: 7,
    localTime: localTimeToDate("10:00"),
    timezone: "Europe/Berlin",
    fromUtc: new Date("2026-03-20T00:00:00.000Z"),
    daysAhead: 25,
  });
  assertEquals(out.map((d) => d.toISOString()), [
    "2026-03-22T09:00:00.000Z",
    "2026-03-29T08:00:00.000Z",
    "2026-04-05T08:00:00.000Z",
    "2026-04-12T08:00:00.000Z",
  ]);
});

Deno.test("nextOccurrencesUtc: empty when window can't reach the next occurrence", () => {
  const monday = new Date("2026-06-15T09:00:00.000Z");
  const out = nextOccurrencesUtc({
    dayOfWeek: 7, // Sun
    localTime: localTimeToDate("10:00"),
    timezone: "Europe/Moscow",
    fromUtc: monday,
    daysAhead: 3,
  });
  assertEquals(out, []);
});
