import type { Bot, Context } from "grammy";
import { type Action, decodeCallbackData } from "@/services/callbackData.ts";
import { findOrCreateTelegramUser } from "@/db/users.ts";
import {
  cancelRegistration,
  registerUserForEvent,
} from "@/db/registrations.ts";
import { refreshAnnouncements } from "@/services/announce.ts";

/**
 * Tap on a Register / Cancel / Waitlist button under a live announcement
 * message. Inline-keyboard callbacks come from `callback_query.data` —
 * we decode + verify HMAC, run the FSM, edit the message in place.
 */
export function handleCallbackQuery(bot: Bot) {
  return async (ctx: Context): Promise<void> => {
    const cb = ctx.callbackQuery;
    if (!cb?.data) return;
    const decoded = await decodeCallbackData(cb.data);
    if (!decoded.ok) {
      await ctx.answerCallbackQuery({
        text: `Кнопка устарела (${decoded.error})`,
        show_alert: false,
      });
      return;
    }

    const from = cb.from;
    const user = await findOrCreateTelegramUser(from.id, {
      username: from.username,
      firstName: from.first_name,
    });

    const reply = await runAction(decoded.action, decoded.eventId, user.id);
    await ctx.answerCallbackQuery({ text: reply.toast });
    // Fire-and-forget; we already answered the user.
    void refreshAnnouncements(bot, decoded.eventId).catch((err) => {
      console.error("[announce] refresh failed", err);
    });
  };
}

async function runAction(
  action: Action,
  eventId: string,
  userId: string,
): Promise<{ toast: string }> {
  switch (action) {
    case "reg":
    case "wai": {
      const out = await registerUserForEvent(eventId, userId);
      if (!out.ok) {
        return {
          toast: out.reason === "FULL"
            ? "Все места и резерв заняты"
            : "Событие не найдено",
        };
      }
      if (out.alreadyRegistered) {
        return {
          toast: out.status === "CONFIRMED"
            ? "Вы уже записаны ✅"
            : "Вы уже в резерве ⏳",
        };
      }
      return {
        toast: out.status === "CONFIRMED"
          ? "Записал ✅"
          : "Свободных мест нет — добавил в резерв ⏳",
      };
    }
    case "can": {
      const out = await cancelRegistration(eventId, userId);
      return {
        toast: out.unregistered
          ? out.promotedUserId ? "Снял запись · резерв двинулся" : "Снял запись"
          : "Записи не было",
      };
    }
  }
}
