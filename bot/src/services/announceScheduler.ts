import type { Bot } from "grammy";
import type { BotContext } from "@/context.ts";
import { listTelegramChannelsForEvent } from "@/api/channels.ts";
import {
  type AnnounceableEvent,
  listEventsDueForAnnouncement,
} from "@/api/events.ts";
import { postAnnouncement } from "@/services/announce.ts";

export type AnnounceSchedulerResult = {
  scanned: number;
  posted: number;
  skipped: number;
  errors: Array<{ eventId: string; chatId: string; error: string }>;
};

function announcedChatIds(event: AnnounceableEvent): Set<string> {
  const refs = event.announcements ?? [];
  return new Set(refs.map((r) => r.chatId));
}

/**
 * Post announcements for every event whose `startAt - announceOffsetMinutes`
 * has passed. Skips channels that already have a live message recorded in
 * `Event.announcements` so the cron tick is idempotent.
 */
export async function postDueAnnouncements(
  bot: Bot<BotContext>,
  now: Date = new Date(),
): Promise<AnnounceSchedulerResult> {
  const due = await listEventsDueForAnnouncement(now);
  const result: AnnounceSchedulerResult = {
    scanned: due.length,
    posted: 0,
    skipped: 0,
    errors: [],
  };

  for (const event of due) {
    const channels = await listTelegramChannelsForEvent(event.id);
    if (channels.length === 0) {
      continue;
    }

    const done = announcedChatIds(event);
    for (const ch of channels) {
      if (done.has(ch.target)) {
        result.skipped++;
        continue;
      }
      try {
        await postAnnouncement(bot, event, ch.target);
        result.posted++;
        done.add(ch.target);
      } catch (err) {
        result.errors.push({
          eventId: event.id,
          chatId: ch.target,
          error: err instanceof Error ? err.message : String(err),
        });
      }
    }
  }

  return result;
}
