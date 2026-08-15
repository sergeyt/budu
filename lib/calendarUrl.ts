/** Stable public calendar URL for a place (no signed token). */
export function publicCalendarUrl(placeId: string, baseUrl: string): string {
  const base = baseUrl.replace(/\/+$/, "");
  return `${base}/places/${encodeURIComponent(placeId)}/calendar`;
}
