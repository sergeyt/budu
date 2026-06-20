import type { Context } from "grammy";
import { verifyLinkCode } from "@/services/linkCode.ts";
import {
  findPlaceById,
  linkTelegramChatToPlace,
  unlinkTelegramChatFromPlace,
} from "@/api/places.ts";

function extractCode(text: string | undefined): string | null {
  if (!text) return null;
  const [, ...rest] = text.split(/\s+/);
  const code = rest.join(" ").trim();
  return code || null;
}

export async function handleLink(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const code = extractCode(ctx.message?.text ?? ctx.channelPost?.text);
  if (!code) {
    await ctx.reply("Использование: <code>/link &lt;код&gt;</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const verified = await verifyLinkCode(code);
  if (!verified.ok) {
    await ctx.reply(`❌ Не удалось привязать: ${verified.error}`);
    return;
  }

  const place = await findPlaceById(verified.placeId);
  if (!place) {
    await ctx.reply(`❌ Место не найдено: ${verified.placeId}`);
    return;
  }

  const label = ctx.chat?.type === "private" ? "Owner DM" : ctx.chat?.title ??
    null;
  await linkTelegramChatToPlace(place.id, chatId, label);

  await ctx.reply(
    `✅ Чат привязан к месту: <b>${place.name}</b>\n` +
      `<code>${place.id}</code>`,
    { parse_mode: "HTML" },
  );
}

export async function handleUnlink(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const code = extractCode(ctx.message?.text ?? ctx.channelPost?.text);
  if (!code) {
    await ctx.reply("Использование: <code>/unlink &lt;код&gt;</code>", {
      parse_mode: "HTML",
    });
    return;
  }

  const verified = await verifyLinkCode(code);
  if (!verified.ok) {
    await ctx.reply(`❌ Не удалось отвязать: ${verified.error}`);
    return;
  }

  const place = await findPlaceById(verified.placeId);
  if (!place) {
    await ctx.reply(`❌ Место не найдено: ${verified.placeId}`);
    return;
  }

  const removed = await unlinkTelegramChatFromPlace(place.id, chatId);
  await ctx.reply(
    removed
      ? `🗑 Чат отвязан от места: ${place.name}`
      : `ℹ️ Привязки к месту ${place.name} не было`,
  );
}
