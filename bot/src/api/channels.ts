import { apiFetch } from "./client.ts";
import type { TelegramChannel } from "./types.ts";

export async function listTelegramChannelsForEvent(
  eventId: string,
): Promise<TelegramChannel[]> {
  return await apiFetch<TelegramChannel[]>(
    `/api/internal/bot/events/${eventId}/telegram-channels`,
  );
}
