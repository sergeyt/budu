import { errorMiddleware, errors } from "@/lib/error";
import { getEventDetailForPlace, getPlaceForCalendar } from "@/lib/calendar";

type Params = { id?: string; eventId?: string };

/** Public read — no auth. Hides cancelled events. */
export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  const { id: placeId, eventId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  if (!eventId) {
    throw errors.missingParam("eventId");
  }
  await getPlaceForCalendar(placeId);
  return await getEventDetailForPlace({
    placeId,
    eventId,
    includeCancelled: false,
  });
});
