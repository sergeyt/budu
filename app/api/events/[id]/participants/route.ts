import { BadRequestError, errorMiddleware } from "@/lib/error";
import { fetchParticipants } from "@/lib/participants";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw new BadRequestError("eventId is required");
  }
  return fetchParticipants(eventId);
});
