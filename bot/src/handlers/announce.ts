import type { Bot, Context } from "grammy";
import type { BotContext } from "@/context.ts";
import { findNextEventForPlace } from "@/api/events.ts";
import { placesLinkedToChat } from "@/api/places.ts";
import { postAnnouncement } from "@/services/announce.ts";
import { tr } from "@/i18n.ts";

/**
 * Manual nudge: post the next upcoming event for whichever place(s) this
 * chat is linked to. Useful for sanity-checking templates + capacities
 * before the scheduler hits.
 */
export function handleAnnounceNext(bot: Bot<BotContext>) {
  return async (ctx: Context): Promise<void> => {
    const chatId = ctx.chat?.id;
    if (!chatId) return;

    const places = await placesLinkedToChat(chatId);
    if (places.length === 0) {
      await ctx.reply(tr(ctx, "announce.not_linked"));
      return;
    }

    let posted = 0;
    for (const place of places) {
      const event = await findNextEventForPlace(place.id);
      if (!event) continue;
      await postAnnouncement(bot, event, chatId);
      posted++;
    }
    if (posted === 0) {
      await ctx.reply(tr(ctx, "announce.no_events"));
    }
  };
}
