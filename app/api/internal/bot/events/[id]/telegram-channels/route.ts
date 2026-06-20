import { listTelegramChannelsForEvent } from "@/lib/bot/channels";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";

type Params = { id?: string };

export const GET = botRoute<Params>(async (_req, ctx) => {
  const { id } = await ctx.params;
  if (!id) {
    throw errors.missingParam("id");
  }
  return await listTelegramChannelsForEvent(id);
});
