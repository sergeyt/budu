import type { Context } from "grammy";
import { api } from "@/api/client.ts";
import { webAppBaseUrl } from "@/config.ts";
import { tr } from "@/i18n.ts";

/**
 * `/calendar` — share the public calendar URL for the linked place.
 */
export async function handleCalendar(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) {
    return;
  }

  const places = await api.places.listByChat(chatId);
  if (places.length === 0) {
    await ctx.reply(tr(ctx, "calendar.not_linked"), { parse_mode: "HTML" });
    return;
  }

  const lines: string[] = [tr(ctx, "calendar.header")];
  for (const place of places) {
    const { url } = await api.places.mintCalendarLink(
      place.id,
      webAppBaseUrl(),
    );
    lines.push(`📍 <b>${escapeHtml(place.name)}</b>\n${escapeHtml(url)}`);
  }

  await ctx.reply(lines.join("\n\n"), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}
