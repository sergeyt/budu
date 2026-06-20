import { findOrCreateTelegramUser } from "@/lib/bot/users";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { z } from "zod";

const Body = z.object({
  telegramUserId: z.number().int().positive(),
  username: z.string().optional(),
  firstName: z.string().optional(),
});

export const POST = botRoute(async (req) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("telegramUser", parsed.error.flatten());
  }
  return await findOrCreateTelegramUser(parsed.data);
});
