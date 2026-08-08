import { findOrCreateTelegramUser } from "@/lib/bot/users";
import { botRoute } from "@/lib/bot-api-route";
import { errors } from "@/lib/error";
import { createWebLoginToken } from "@/lib/telegramLinkCode";
import { z } from "zod";

const Body = z.object({
  telegramUserId: z.number().int().positive(),
  username: z.string().optional(),
  firstName: z.string().optional(),
});

function appOrigin(): string {
  const url = process.env.AUTH_URL?.replace(/\/+$/, "");
  if (!url) {
    throw errors.missingParam("AUTH_URL");
  }
  return url;
}

/** Mint a short-lived web magic-login URL for a Telegram identity. */
export const POST = botRoute(async (req) => {
  const parsed = Body.safeParse(await req.json());
  if (!parsed.success) {
    throw errors.invalidPayload("webLogin", parsed.error.flatten());
  }
  const user = await findOrCreateTelegramUser(parsed.data);
  const token = createWebLoginToken(user.id);
  return {
    url: `${appOrigin()}/api/auth/telegram-login?token=${encodeURIComponent(token)}`,
  };
});
