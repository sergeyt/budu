import {
  cancelRegistration,
  registerUserForEvent,
} from "@/lib/bot/registrations";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { z } from "zod";

type Params = { id?: string };

const Body = z.object({
  userId: z.string().min(1),
});

export const POST = botRoute<Params>(async (req, ctx) => {
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw errors.missingParam("eventId");
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("register", parsed.error.flatten());
  }
  return await registerUserForEvent(eventId, parsed.data.userId);
});

export const DELETE = botRoute<Params>(async (req, ctx) => {
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw errors.missingParam("eventId");
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("register", parsed.error.flatten());
  }
  return await cancelRegistration(eventId, parsed.data.userId);
});
