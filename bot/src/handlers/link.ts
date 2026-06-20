import type { Context } from "grammy";
import { verifyLinkCode } from "@/services/linkCode.ts";
import { api } from "@/api/client.ts";
import { tr } from "@/i18n.ts";

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
    await ctx.reply(tr(ctx, "link.usage"), { parse_mode: "HTML" });
    return;
  }

  const verified = await verifyLinkCode(code);
  if (!verified.ok) {
    await ctx.reply(tr(ctx, "link.failed", { error: verified.error }));
    return;
  }

  const place = await api.places.findById(verified.placeId);
  if (!place) {
    await ctx.reply(
      tr(ctx, "link.place_not_found", { placeId: verified.placeId }),
    );
    return;
  }

  const label = ctx.chat?.type === "private" ? "Owner DM" : ctx.chat?.title ??
    null;
  await api.places.linkTelegram(place.id, chatId, label);

  await ctx.reply(
    tr(ctx, "link.success", { name: place.name, placeId: place.id }),
    { parse_mode: "HTML" },
  );
}

export async function handleUnlink(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;
  const code = extractCode(ctx.message?.text ?? ctx.channelPost?.text);
  if (!code) {
    await ctx.reply(tr(ctx, "unlink.usage"), { parse_mode: "HTML" });
    return;
  }

  const verified = await verifyLinkCode(code);
  if (!verified.ok) {
    await ctx.reply(tr(ctx, "unlink.failed", { error: verified.error }));
    return;
  }

  const place = await api.places.findById(verified.placeId);
  if (!place) {
    await ctx.reply(
      tr(ctx, "unlink.place_not_found", { placeId: verified.placeId }),
    );
    return;
  }

  const removed = await api.places.unlinkTelegram(place.id, chatId);
  await ctx.reply(
    removed
      ? tr(ctx, "unlink.success", { name: place.name })
      : tr(ctx, "unlink.not_linked", { name: place.name }),
  );
}
