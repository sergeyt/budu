import type { Bot, Context } from "grammy";
import { findEventById } from "@/db/events.ts";
import { findOrCreateTelegramUser } from "@/db/users.ts";
import { buildAnnouncement } from "@/services/announce.ts";
import { canRegisterNow } from "@/services/registrationWindow.ts";

function displayName(ctx: Context): string {
  const chat = ctx.chat;
  if (chat && "first_name" in chat && chat.first_name) {
    return chat.first_name;
  }
  if (chat && "title" in chat && chat.title) {
    return chat.title;
  }
  return "there";
}

function parseStartPayload(text: string | undefined): string | null {
  if (!text) {
    return null;
  }
  const payload = text.split(/\s+/)[1]?.trim();
  if (!payload?.startsWith("ev_")) {
    return null;
  }
  const eventId = payload.slice(3);
  return eventId || null;
}

async function handleEventDeepLink(
  ctx: Context,
  eventId: string,
): Promise<boolean> {
  const from = ctx.from;
  if (!from) {
    return false;
  }

  await findOrCreateTelegramUser(from.id, {
    username: from.username,
    firstName: from.first_name,
  });

  const event = await findEventById(eventId);
  if (!event) {
    await ctx.reply("Событие не найдено или уже прошло.");
    return true;
  }

  const payload = await buildAnnouncement(event);
  const open = canRegisterNow(event.startAt);
  const hint = open
    ? "Нажмите кнопку ниже, чтобы записаться."
    : "Запись открывается за 24 часа до начала.";

  await ctx.reply(`${payload.text}\n\n<i>${hint}</i>`, {
    parse_mode: "HTML",
    reply_markup: payload.reply_markup,
    link_preview_options: { is_disabled: true },
  });
  return true;
}

export function handleStart(bot: Bot) {
  return async (ctx: Context): Promise<void> => {
    const eventId = parseStartPayload(ctx.message?.text);
    if (eventId && await handleEventDeepLink(ctx, eventId)) {
      return;
    }

    const chat = ctx.chat;
    const chatId = chat?.id;
    const name = displayName(ctx);

    await ctx.reply(
      `👋 Привет, ${name}!\n\n` +
        `Это чат: <code>${chatId}</code>\n\n` +
        `Команды:\n` +
        `• <code>/link &lt;код&gt;</code> — привязать этот чат к месту\n` +
        `• <code>/unlink &lt;код&gt;</code> — отвязать\n` +
        `• <code>/announce_next</code> — опубликовать анонс ближайшего события\n` +
        `• <code>/templates</code> — шаблоны привязанного места\n` +
        `• <code>/help</code> — помощь\n\n` +
        `Ссылка на событие: <code>t.me/${bot.botInfo.username}?start=ev_&lt;id&gt;</code>`,
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  };
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    "Доступные команды:\n" +
      "/start — приветствие и id чата\n" +
      "/start ev_<id> — открыть событие и записаться\n" +
      "/link <код> — привязать чат к месту\n" +
      "/unlink <код> — отвязать\n" +
      "/announce_next — анонс ближайшего события привязанного места\n" +
      "/templates — шаблоны привязанного места",
  );
}
