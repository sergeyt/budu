import { findNextEventForPlace } from "@/lib/bot/events";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";

export const GET = botRoute(async (req) => {
  const placeId = new URL(req.url).searchParams.get("placeId");
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const event = await findNextEventForPlace(placeId);
  return event;
});
