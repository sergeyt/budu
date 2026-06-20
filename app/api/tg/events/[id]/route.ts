import { findEventById, listParticipants } from "@/lib/bot/events";
import { errorMiddleware, errors } from "@/lib/error";
import { requireTelegramInitData } from "@/lib/tg-api-auth";

type Params = { id?: string };

/** Mini App: event details + full participant list (initData auth). */
export const GET = errorMiddleware<Params>(async (req, ctx) => {
  requireTelegramInitData(req);
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  const event = await findEventById(id);
  if (!event) {
    throw errors.eventNotFound();
  }
  const participants = await listParticipants(id);
  return { event, participants };
});
