import { prisma } from "@/lib/prisma";
import { ChannelType } from "@/types/model";
import { getEffectiveChannelsForEvent } from "./effectiveChannels";
import { sendMessage as sendMaxMessage } from "./transports/max";
import { sendTelegramMessage } from "./transports/telegram";
import { getTranslations } from "@/lib/locale";
import { log } from "@/lib/log";

/**
 * Notify place channels that an event was cancelled (fire-and-forget safe).
 * Also posts a follow-up on known announcement chats when message ids exist.
 */
export async function notifyEventCancelled(opts: {
  req: Request;
  eventId: string;
  reason: string;
}) {
  const event = await prisma.event.findUnique({
    where: { id: opts.eventId },
    include: { place: true },
  });
  if (!event) {
    log.warn("notifyEventCancelled: event not found", {
      eventId: opts.eventId,
    });
    return;
  }

  const channels = await getEffectiveChannelsForEvent(event.id);
  if (!channels.length) {
    log.info("notifyEventCancelled: no connected channels", {
      eventId: event.id,
    });
    return;
  }

  const t = await getTranslations(opts.req, "notifications");
  const when = new Date(event.startAt).toLocaleString();
  const text = [
    t("cancelled_header", {
      place: event.place.name,
      event: event.title,
      when,
    }),
    t("cancelled_reason", { reason: opts.reason }),
  ].join("\n");

  for (const channel of channels) {
    try {
      switch (channel.type) {
        case ChannelType.TELEGRAM:
          await sendTelegramMessage({
            chatId: channel.target,
            parseMode: "MarkdownV2",
            text,
          });
          break;
        case ChannelType.MAX:
          await sendMaxMessage(channel.target, text);
          break;
      }
    } catch (err) {
      log.error("notifyEventCancelled: channel send failed", err, {
        eventId: event.id,
        channelType: channel.type,
      });
    }
  }
}
