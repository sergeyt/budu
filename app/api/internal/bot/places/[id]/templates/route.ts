import { createTemplateForTelegramAdmin } from "@/lib/bot/templates";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { CreateEventTemplate } from "@/lib/validation";
import { z } from "zod";

type Params = { id?: string };

const Body = CreateEventTemplate.extend({
  telegramUserId: z.number().int().positive(),
});

export const POST = botRoute<Params>(async (req, ctx) => {
  const { id: placeId } = await ctx.params;
  if (!placeId) {
    throw errors.missingParam("placeId");
  }
  const raw = await req.json();
  const parsed = Body.safeParse(raw);
  if (!parsed.success) {
    throw errors.invalidPayload("template", parsed.error.flatten());
  }
  const { telegramUserId, ...body } = parsed.data;
  const tpl = await createTemplateForTelegramAdmin({
    telegramUserId,
    placeId,
    body,
  });
  if (!tpl) {
    throw errors.forbidden();
  }
  return tpl;
});
