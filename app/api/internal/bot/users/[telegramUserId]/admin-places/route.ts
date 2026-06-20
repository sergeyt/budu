import { listAdminPlacesForTelegramUser } from "@/lib/bot/admin";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";

type Params = { telegramUserId?: string };

export const GET = botRoute<Params>(async (_req, ctx) => {
  const { telegramUserId } = await ctx.params;
  if (!telegramUserId) {
    throw errors.missingParam("telegramUserId");
  }
  const id = Number(telegramUserId);
  if (!Number.isFinite(id)) {
    throw errors.invalidPayload("telegramUserId", { telegramUserId });
  }
  return await listAdminPlacesForTelegramUser(id);
});
