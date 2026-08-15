import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { findPlaceById } from "@/lib/bot/places";
import { publicCalendarUrl } from "@/lib/calendar";

type Params = { id?: string };

export const POST = botRoute<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const place = await findPlaceById(placeId);
  if (!place) {
    throw errors.placeNotFound();
  }

  let baseUrl =
    process.env.AUTH_URL ??
    process.env.WEB_APP_BASE_URL ??
    new URL(req.url).origin;
  try {
    const body = (await req.json()) as { baseUrl?: string };
    if (body.baseUrl) {
      baseUrl = body.baseUrl;
    }
  } catch {
    // empty body ok
  }

  return { url: publicCalendarUrl(placeId, baseUrl) };
});
