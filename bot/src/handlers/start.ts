import type { Bot, Context } from "grammy";
import type { BotContext } from "@/context.ts";
import { findEventById } from "@/api/events.ts";
import { findOrCreateTelegramUser } from "@/api/users.ts";
import { buildAnnouncement } from "@/services/announce.ts";
import { canRegisterNow } from "@/services/registrationWindow.ts";
import { tr } from "@/i18n.ts";

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
    await ctx.reply(tr(ctx, "start.event_not_found"));
    return true;
  }

  const payload = await buildAnnouncement(event);
  const open = canRegisterNow(event.startAt);
  const hint = open
    ? tr(ctx, "start.register_open")
    : tr(ctx, "start.register_closed");

  await ctx.reply(`${payload.text}\n\n<i>${hint}</i>`, {
    parse_mode: "HTML",
    reply_markup: payload.reply_markup,
    link_preview_options: { is_disabled: true },
  });
  return true;
}

export function handleStart(bot: Bot<BotContext>) {
  return async (ctx: Context): Promise<void> => {
    const eventId = parseStartPayload(ctx.message?.text);
    if (eventId && await handleEventDeepLink(ctx, eventId)) {
      return;
    }

    const chat = ctx.chat;
    const chatId = chat?.id;
    const name = displayName(ctx);

    await ctx.reply(
      [
        tr(ctx, "start.greeting", { name }),
        "",
        tr(ctx, "start.chat_id", { chatId: String(chatId) }),
        "",
        tr(ctx, "start.commands_header"),
        tr(ctx, "start.cmd_link"),
        tr(ctx, "start.cmd_unlink"),
        tr(ctx, "start.cmd_announce"),
        tr(ctx, "start.cmd_templates"),
        tr(ctx, "start.cmd_new_template"),
        tr(ctx, "start.cmd_help"),
        "",
        tr(ctx, "start.deep_link_hint", { bot: bot.botInfo.username }),
      ].join("\n"),
      { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
    );
  };
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(tr(ctx, "help.body"));
}
