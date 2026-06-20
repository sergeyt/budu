import { placesLinkedToChat } from "@/lib/bot/places";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";

type Params = { chatId?: string };

export const GET = botRoute<Params>(async (_req, ctx) => {
  const { chatId } = await ctx.params;
  if (!chatId) {
    throw errors.missingParam("chatId");
  }
  const id = Number(chatId);
  if (!Number.isFinite(id)) {
    throw errors.invalidPayload("chatId", { chatId });
  }
  return await placesLinkedToChat(id);
});
