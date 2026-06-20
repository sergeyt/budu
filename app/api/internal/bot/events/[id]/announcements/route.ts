import { getAnnouncements, upsertAnnouncement } from "@/lib/bot/registrations";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { z } from "zod";

type Params = { id?: string };

const Ref = z.object({
  chatId: z.string().min(1),
  messageId: z.number().int().positive(),
  lastRenderedAt: z.string().min(1),
  lastSignature: z.string(),
});

export const GET = botRoute<Params>(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  return await getAnnouncements(id);
});

export const PUT = botRoute<Params>(async (req, ctx) => {
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  const parsed = Ref.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("announcement", parsed.error.flatten());
  }
  await upsertAnnouncement(id, parsed.data);
  return { ok: true };
});
