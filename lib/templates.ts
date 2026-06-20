import { DateTime, IANAZone } from "luxon";

/**
 * Validate an IANA timezone string against the host's tz database.
 * `Intl.DateTimeFormat` would also work but accepts a wider grab-bag
 * (incl. abbreviations like "EST" that we explicitly don't want).
 */
export function isValidIanaZone(zone: string): boolean {
  return IANAZone.isValidZone(zone);
}

/**
 * Convert a Postgres TIME(0) Date (which Prisma surfaces as a Date pinned
 * to 1970-01-01 with only the time-of-day populated) to "HH:MM".
 */
export function dateToLocalTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

/**
 * Parse "HH:MM" (or "HH:MM:SS") into a Date suitable for writing to a
 * Postgres TIME(0) column. We use UTC epoch + the time of day so the
 * local clock of whoever runs the code never bleeds into the value.
 */
export function localTimeToDate(s: string): Date {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) {
    throw new Error(`invalid localTime: ${JSON.stringify(s)}`);
  }
  const [, hh, mm, ss = "00"] = m;
  const h = Number(hh);
  const min = Number(mm);
  const sec = Number(ss);
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    throw new Error(`invalid localTime: ${JSON.stringify(s)}`);
  }
  return new Date(Date.UTC(1970, 0, 1, h, min, sec));
}

export type WeekdayName = "Mon" | "Tue" | "Wed" | "Thu" | "Fri" | "Sat" | "Sun";

const WEEKDAY_NAMES: WeekdayName[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

/** ISO 1–7 → "Mon"…"Sun". Throws on out-of-range. */
export function weekdayName(isoDayOfWeek: number): WeekdayName {
  if (!Number.isInteger(isoDayOfWeek) || isoDayOfWeek < 1 || isoDayOfWeek > 7) {
    throw new Error(`invalid dayOfWeek: ${isoDayOfWeek}`);
  }
  return WEEKDAY_NAMES[isoDayOfWeek - 1];
}

/**
 * Compute upcoming weekly occurrences of (dayOfWeek, localTime) in the
 * given IANA `timezone`, returned as UTC Dates. Luxon handles DST: the
 * local clock stays at the configured time, the UTC instant shifts.
 *
 * Caller decides the window:
 *   - `fromUtc` — only occurrences strictly after this instant
 *   - `daysAhead` — upper bound, exclusive
 *
 * Used both by the bot's materializer and by the admin UI's "next N"
 * preview, so it's a pure function with no I/O.
 */
export function nextOccurrencesUtc(input: {
  dayOfWeek: number;
  localTime: Date; // 1970-01-01T<hh>:<mm>:<ss>Z
  timezone: string;
  fromUtc: Date;
  daysAhead: number;
}): Date[] {
  const { dayOfWeek, localTime, timezone, fromUtc, daysAhead } = input;
  const h = localTime.getUTCHours();
  const m = localTime.getUTCMinutes();
  const s = localTime.getUTCSeconds();

  const from = DateTime.fromJSDate(fromUtc, { zone: "utc" }).setZone(timezone);
  const end = from.plus({ days: daysAhead });

  // Start at today (local) at the target time, then jump to the right
  // weekday. Luxon's `weekday` is ISO 1–7 (1=Mon … 7=Sun).
  let cursor = from.set({ hour: h, minute: m, second: s, millisecond: 0 });
  const wdiff = (dayOfWeek - cursor.weekday + 7) % 7;
  cursor = cursor.plus({ days: wdiff });
  if (cursor <= from) {
    cursor = cursor.plus({ weeks: 1 });
  }

  const out: Date[] = [];
  while (cursor < end) {
    out.push(cursor.toUTC().toJSDate());
    cursor = cursor.plus({ weeks: 1 });
  }
  return out;
}
