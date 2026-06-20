import type { Bot, Context } from "grammy";
import type { BotContext } from "@/context.ts";
import { api } from "@/api/client.ts";
import { type Action, decodeCallbackData } from "@/services/callbackData.ts";
import {
  buildFullListMessage,
  scheduleAnnouncementRefresh,
} from "@/services/announce.ts";
import { tr } from "@/i18n.ts";

export function handleCallbackQuery(bot: Bot<BotContext>) {
  return async (ctx: Context): Promise<void> => {
    const cb = ctx.callbackQuery;
    if (!cb?.data) {
      return;
    }
    const decoded = await decodeCallbackData(cb.data);
    if (!decoded.ok) {
      await ctx.answerCallbackQuery({
        text: tr(ctx, "registration.stale_button", { error: decoded.error }),
        show_alert: false,
      });
      return;
    }

    if (decoded.action === "list") {
      const text = await buildFullListMessage(decoded.eventId);
      try {
        await bot.api.sendMessage(cb.from.id, text, {
          parse_mode: "HTML",
          link_preview_options: { is_disabled: true },
        });
        await ctx.answerCallbackQuery();
      } catch (err) {
        console.error("[registration] full list DM failed", err);
        await ctx.answerCallbackQuery({
          text: tr(ctx, "registration.list_dm_failed"),
          show_alert: true,
        });
      }
      return;
    }

    const from = cb.from;
    const user = await api.users.findOrCreateTelegram(from.id, {
      username: from.username,
      firstName: from.first_name,
    });

    const reply = await runAction(ctx, decoded.action, decoded.eventId, user.id);
    await ctx.answerCallbackQuery({ text: reply.toast });
    scheduleAnnouncementRefresh(bot, decoded.eventId);
  };
}

async function runAction(
  ctx: Context,
  action: Exclude<Action, "list">,
  eventId: string,
  userId: string,
): Promise<{ toast: string }> {
  switch (action) {
    case "reg":
    case "wai": {
      const out = await api.announcements.register(eventId, userId);
      if (!out.ok) {
        if (out.reason === "WINDOW_CLOSED") {
          return { toast: tr(ctx, "registration.window_closed") };
        }
        return {
          toast: out.reason === "FULL"
            ? tr(ctx, "registration.full")
            : tr(ctx, "registration.event_not_found"),
        };
      }
      if (out.alreadyRegistered) {
        return {
          toast: out.status === "CONFIRMED"
            ? tr(ctx, "registration.already_confirmed")
            : tr(ctx, "registration.already_waitlist"),
        };
      }
      return {
        toast: out.status === "CONFIRMED"
          ? tr(ctx, "registration.registered")
          : tr(ctx, "registration.waitlisted"),
      };
    }
    case "can": {
      const out = await api.announcements.cancel(eventId, userId);
      return {
        toast: out.unregistered
          ? out.promotedUserId
            ? tr(ctx, "registration.cancelled_promoted")
            : tr(ctx, "registration.cancelled")
          : tr(ctx, "registration.not_registered"),
      };
    }
  }
}
