import {
  linkTelegramChatToPlace,
  unlinkTelegramChatFromPlace,
} from "@/lib/bot/places";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { z } from "zod";

type Params = { id?: string };

const Body = z.object({
  chatId: z.number().int(),
  label: z.string().nullable().optional(),
});

export const POST = botRoute<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("telegramLink", parsed.error.flatten());
  }
  await linkTelegramChatToPlace({
    placeId,
    chatId: parsed.data.chatId,
    label: parsed.data.label ?? null,
  });
  return { ok: true };
});

export const DELETE = botRoute<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("telegramLink", parsed.error.flatten());
  }
  const removed = await unlinkTelegramChatFromPlace({
    placeId,
    chatId: parsed.data.chatId,
  });
  return { ok: true, removed };
});
