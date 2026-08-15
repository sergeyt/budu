import { errorMiddleware, errors } from "@/lib/error";
import { getPlaceForCalendar, listPlaceEventsInRange } from "@/lib/calendar";

type Params = { id?: string };

function parseRange(url: URL): { from: Date; to: Date } {
  const fromRaw = url.searchParams.get("from");
  const toRaw = url.searchParams.get("to");
  if (!fromRaw || !toRaw) {
    throw errors.missingParam("from/to");
  }
  const from = new Date(fromRaw);
  const to = new Date(toRaw);
  if (Number.isNaN(from.getTime()) || Number.isNaN(to.getTime())) {
    throw errors.invalidPayload("range", { from: fromRaw, to: toRaw });
  }
  return { from, to };
}

/** Public read — no auth. Scheduled events only. */
export const GET = errorMiddleware<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const place = await getPlaceForCalendar(placeId);
  const { from, to } = parseRange(new URL(req.url));
  const events = await listPlaceEventsInRange({
    placeId,
    from,
    to,
    includeCancelled: false,
  });
  return {
    place: {
      id: place.id,
      name: place.name,
      timezone: place.timezone,
    },
    events,
  };
});
