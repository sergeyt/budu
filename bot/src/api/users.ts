import { apiFetch } from "./client.ts";
import type { BotUser } from "./types.ts";

export async function findOrCreateTelegramUser(
  telegramUserId: number,
  attrs: { username?: string; firstName?: string },
): Promise<BotUser> {
  return await apiFetch<BotUser>("/api/internal/bot/users/telegram", {
    method: "POST",
    body: {
      telegramUserId,
      username: attrs.username,
      firstName: attrs.firstName,
    },
  });
}
