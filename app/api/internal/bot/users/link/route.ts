import { linkTelegramAccount } from "@/lib/bot/users";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { z } from "zod";

const Body = z.object({
  code: z.string().min(1),
  telegramUserId: z.number().int().positive(),
  username: z.string().optional(),
  firstName: z.string().optional(),
});

export const POST = botRoute(async (req) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("telegramLink", parsed.error.flatten());
  }
  return await linkTelegramAccount(parsed.data);
});
