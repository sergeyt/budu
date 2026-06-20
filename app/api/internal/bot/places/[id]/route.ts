import { findPlaceById } from "@/lib/bot/places";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";

type Params = { id?: string };

export const GET = botRoute<Params>(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  const place = await findPlaceById(id);
  if (!place) {
    throw errors.placeNotFound();
  }
  return place;
});
