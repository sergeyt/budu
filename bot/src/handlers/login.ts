import { InlineKeyboard } from "grammy";
import type { Context } from "grammy";
import { api, ApiError } from "@/api/client.ts";
import { tr } from "@/i18n.ts";

/** Mint a web magic-login URL and send it as a DM button. */
export async function handleLogin(ctx: Context): Promise<void> {
  if (ctx.chat?.type !== "private") {
    await ctx.reply(tr(ctx, "login.dm_only"));
    return;
  }

  const from = ctx.from;
  if (!from) {
    return;
  }

  try {
    const { url } = await api.users.mintWebLogin(from.id, {
      username: from.username,
      firstName: from.first_name,
    });
    const keyboard = new InlineKeyboard().url(tr(ctx, "login.button"), url);
    await ctx.reply(tr(ctx, "login.body"), {
      reply_markup: keyboard,
      link_preview_options: { is_disabled: true },
    });
  } catch (err) {
    const message = err instanceof ApiError
      ? err.message
      : err instanceof Error
      ? err.message
      : "unknown error";
    await ctx.reply(tr(ctx, "login.failed", { error: message }));
  }
}
