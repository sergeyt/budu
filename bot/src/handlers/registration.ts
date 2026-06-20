import type { Bot, Context } from "grammy";
import { type Action, decodeCallbackData } from "@/services/callbackData.ts";
import { findOrCreateTelegramUser } from "@/api/users.ts";
import {
  cancelRegistration,
  registerUserForEvent,
} from "@/api/announcements.ts";
import {
  buildFullListMessage,
  scheduleAnnouncementRefresh,
} from "@/services/announce.ts";

export function handleCallbackQuery(bot: Bot) {
  return async (ctx: Context): Promise<void> => {
    const cb = ctx.callbackQuery;
    if (!cb?.data) {
      return;
    }
    const decoded = await decodeCallbackData(cb.data);
    if (!decoded.ok) {
      await ctx.answerCallbackQuery({
        text: `Кнопка устарела (${decoded.error})`,
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
          text: "Не удалось отправить список в личку. Напишите боту /start.",
          show_alert: true,
        });
      }
      return;
    }

    const from = cb.from;
    const user = await findOrCreateTelegramUser(from.id, {
      username: from.username,
      firstName: from.first_name,
    });

    const reply = await runAction(decoded.action, decoded.eventId, user.id);
    await ctx.answerCallbackQuery({ text: reply.toast });
    scheduleAnnouncementRefresh(bot, decoded.eventId);
  };
}

async function runAction(
  action: Exclude<Action, "list">,
  eventId: string,
  userId: string,
): Promise<{ toast: string }> {
  switch (action) {
    case "reg":
    case "wai": {
      const out = await registerUserForEvent(eventId, userId);
      if (!out.ok) {
        if (out.reason === "WINDOW_CLOSED") {
          return {
            toast: "Запись открывается за 24ч до начала и закрывается в старт",
          };
        }
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
