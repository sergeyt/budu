/**
 * Mirrors `canRegisterNow` from `lib/util.ts` in the Next app.
 * Registration opens 24h before start and closes at start.
 */
export function canRegisterNow(startAt: Date, now: Date = new Date()): boolean {
  const openAt = new Date(startAt.getTime() - 24 * 60 * 60 * 1000);
  return now >= openAt && now < startAt;
}
