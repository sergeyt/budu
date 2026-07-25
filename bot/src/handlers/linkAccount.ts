import type { Context } from "grammy";
import { api, ApiError } from "@/api/client.ts";
import { tr } from "@/i18n.ts";

function extractCode(text: string | undefined): string | null {
  if (!text) return null;
  const [, ...rest] = text.split(/\s+/);
  const code = rest.join(" ").trim();
  return code || null;
}

/** Bind this Telegram user to a Budu web account via a session-minted code. */
export async function handleLinkAccount(ctx: Context): Promise<void> {
  if (ctx.chat?.type !== "private") {
    await ctx.reply(tr(ctx, "link_account.dm_only"));
    return;
  }

  const from = ctx.from;
  if (!from) return;

  const code = extractCode(ctx.message?.text);
  if (!code) {
    await ctx.reply(tr(ctx, "link_account.usage"), { parse_mode: "HTML" });
    return;
  }

  try {
    const user = await api.users.linkAccount(from.id, code, {
      username: from.username,
      firstName: from.first_name,
    });
    await ctx.reply(
      tr(ctx, "link_account.success", {
        name: user.name ?? from.first_name ?? "ok",
        userId: user.id,
      }),
      { parse_mode: "HTML" },
    );
  } catch (err) {
    const message = err instanceof ApiError
      ? err.message
      : err instanceof Error
      ? err.message
      : "unknown error";
    await ctx.reply(tr(ctx, "link_account.failed", { error: message }));
  }
}
