import { prisma } from "@/lib/prisma";
import { getEffectiveChannelsForEvent } from "@/lib/notifications/effectiveChannels";
import type { TelegramChannelDto } from "@/lib/bot/types";

export async function listTelegramChannelsForEvent(
  eventId: string,
): Promise<TelegramChannelDto[]> {
  const channels = await getEffectiveChannelsForEvent(eventId);
  return channels
    .filter((c) => c.type === "TELEGRAM")
    .map((c) => ({ target: c.target, label: c.label ?? null }));
}
