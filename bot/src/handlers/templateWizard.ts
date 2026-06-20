import type { Bot } from "grammy";
import {
  type Conversation,
  conversations,
  createConversation,
} from "@grammyjs/conversations";
import { createTemplateForAdmin, listAdminPlaces } from "@/api/admin.ts";
import type { Place } from "@/api/types.ts";
import { findOrCreateTelegramUser } from "@/api/users.ts";
import type { BotContext } from "@/context.ts";
import { tr } from "@/i18n.ts";

async function readText(
  conversation: Conversation<BotContext>,
): Promise<string | null> {
  const next = await conversation.waitFor("message:text");
  if (next.message?.text?.startsWith("/")) {
    await next.reply("Cancelled.");
    return null;
  }
  return next.message?.text?.trim() ?? null;
}

async function newTemplateConversation(
  conversation: Conversation<BotContext>,
  ctx: BotContext,
): Promise<void> {
  if (ctx.chat?.type !== "private") {
    await ctx.reply(tr(ctx, "wizard.dm_only"));
    return;
  }
  const from = ctx.from;
  if (!from) {
    return;
  }

  await conversation.external(() =>
    findOrCreateTelegramUser(from.id, {
      username: from.username,
      firstName: from.first_name,
    })
  );

  const places = await conversation.external(() =>
    listAdminPlaces(from.id)
  );
  if (places.length === 0) {
    await ctx.reply(tr(ctx, "wizard.no_places"));
    return;
  }

  const lines = places.map((p: Place, i: number) => `${i + 1}. ${p.name}`);
  await ctx.reply(`${tr(ctx, "wizard.pick_place")}\n\n${lines.join("\n")}`);

  const pickRaw = await readText(conversation);
  if (pickRaw === null) {
    return;
  }
  const pick = Number(pickRaw);
  if (!Number.isInteger(pick) || pick < 1 || pick > places.length) {
    await ctx.reply(tr(ctx, "wizard.invalid_pick"));
    return;
  }
  const place = places[pick - 1];

  await ctx.reply(tr(ctx, "wizard.title_prompt"));
  const title = await readText(conversation);
  if (title === null) {
    return;
  }
  if (!title) {
    await ctx.reply(tr(ctx, "wizard.title_required"));
    return;
  }

  await ctx.reply(tr(ctx, "wizard.day_prompt"));
  const dayRaw = await readText(conversation);
  if (dayRaw === null) {
    return;
  }
  const dayOfWeek = Number(dayRaw);
  if (!Number.isInteger(dayOfWeek) || dayOfWeek < 1 || dayOfWeek > 7) {
    await ctx.reply(tr(ctx, "wizard.day_invalid"));
    return;
  }

  await ctx.reply(tr(ctx, "wizard.time_prompt"));
  const localTime = await readText(conversation);
  if (localTime === null) {
    return;
  }
  if (!/^([01]?\d|2[0-3]):[0-5]\d$/.test(localTime)) {
    await ctx.reply(tr(ctx, "wizard.time_invalid"));
    return;
  }

  await ctx.reply(tr(ctx, "wizard.capacity_prompt"));
  const capRaw = await readText(conversation);
  if (capRaw === null) {
    return;
  }
  let capacity: number | null = null;
  if (capRaw !== "-") {
    const n = Number(capRaw);
    if (!Number.isInteger(n) || n < 0) {
      await ctx.reply(tr(ctx, "wizard.capacity_invalid"));
      return;
    }
    capacity = n;
  }

  const created = await conversation.external(() =>
    createTemplateForAdmin(place.id, from.id, {
      title,
      dayOfWeek,
      localTime,
      capacity,
      durationMinutes: 60,
      announceOffsetMinutes: 1440,
    })
  );

  await ctx.reply(
    tr(ctx, "wizard.created", { title: created.title, place: place.name }),
    { parse_mode: "HTML" },
  );
}

export function registerTemplateWizard(bot: Bot<BotContext>): void {
  bot.use(conversations());
  bot.use(createConversation(newTemplateConversation, "new_template"));
  bot.command("new_template", async (ctx) => {
    await ctx.conversation.enter("new_template");
  });
}
