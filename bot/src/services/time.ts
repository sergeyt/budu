import { DateTime } from "luxon";

/**
 * Time helpers shared with the Next app's `lib/templates.ts`. Keep the two
 * in sync — the materializer here and the admin "next N preview" there
 * both consume `nextOccurrencesUtc` and must agree to the millisecond.
 */

export function dateToLocalTime(d: Date): string {
  const hh = String(d.getUTCHours()).padStart(2, "0");
  const mm = String(d.getUTCMinutes()).padStart(2, "0");
  return `${hh}:${mm}`;
}

export function localTimeToDate(s: string): Date {
  const m = /^(\d{1,2}):(\d{2})(?::(\d{2}))?$/.exec(s.trim());
  if (!m) throw new Error(`invalid localTime: ${JSON.stringify(s)}`);
  const [, hh, mm, ss = "00"] = m;
  const h = Number(hh);
  const min = Number(mm);
  const sec = Number(ss);
  if (h < 0 || h > 23 || min < 0 || min > 59 || sec < 0 || sec > 59) {
    throw new Error(`invalid localTime: ${JSON.stringify(s)}`);
  }
  return new Date(Date.UTC(1970, 0, 1, h, min, sec));
}

export type WeekdayName =
  | "Mon"
  | "Tue"
  | "Wed"
  | "Thu"
  | "Fri"
  | "Sat"
  | "Sun";

const WEEKDAY_NAMES: WeekdayName[] = [
  "Mon",
  "Tue",
  "Wed",
  "Thu",
  "Fri",
  "Sat",
  "Sun",
];

export function weekdayName(isoDayOfWeek: number): WeekdayName {
  if (!Number.isInteger(isoDayOfWeek) || isoDayOfWeek < 1 || isoDayOfWeek > 7) {
    throw new Error(`invalid dayOfWeek: ${isoDayOfWeek}`);
  }
  return WEEKDAY_NAMES[isoDayOfWeek - 1];
}

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

  let cursor = from.set({ hour: h, minute: m, second: s, millisecond: 0 });
  const wdiff = (dayOfWeek - cursor.weekday + 7) % 7;
  cursor = cursor.plus({ days: wdiff });
  if (cursor <= from) cursor = cursor.plus({ weeks: 1 });

  const out: Date[] = [];
  while (cursor < end) {
    out.push(cursor.toUTC().toJSDate());
    cursor = cursor.plus({ weeks: 1 });
  }
  return out;
}
