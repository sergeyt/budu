import type { Context } from "grammy";
import { listTemplatesForChat } from "@/api/templates.ts";
import {
  localTimeToDate,
  nextOccurrencesUtc,
  weekdayName,
} from "@/services/time.ts";

const WEEKDAY_RU: Record<number, string> = {
  1: "Пн",
  2: "Вт",
  3: "Ср",
  4: "Чт",
  5: "Пт",
  6: "Сб",
  7: "Вс",
};

function escapeHtml(s: string): string {
  return s
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;");
}

function formatNext(occUtc: Date, zone: string): string {
  // Server-rendered string, intentionally short. Telegram clients render
  // their own timezone for tg-native datetimes only — for plain text we
  // show local-to-place time so the audience reading the chat sees what
  // they expect.
  const fmt = new Intl.DateTimeFormat("ru-RU", {
    timeZone: zone,
    weekday: "short",
    day: "2-digit",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
  });
  return fmt.format(occUtc);
}

/**
 * `/templates` — read-only listing of templates the chat is linked to.
 *
 * Per M2 scope this command is informational: no creation, no edits. The
 * canonical CRUD UI lives at /admin in the Next app, which is the only
 * place that can authenticate against the web `User` row.
 */
export async function handleTemplates(ctx: Context): Promise<void> {
  const chatId = ctx.chat?.id;
  if (!chatId) return;

  const rows = await listTemplatesForChat(chatId);
  if (rows.length === 0) {
    await ctx.reply(
      "В этом чате нет шаблонов. Свяжите чат с местом командой " +
        "<code>/link &lt;код&gt;</code> и создайте шаблон в админке.",
      { parse_mode: "HTML" },
    );
    return;
  }

  const now = new Date();
  const lines: string[] = [];
  // Group by place so a chat linked to multiple places stays readable.
  let currentPlace = "";
  for (const t of rows) {
    if (t.placeName !== currentPlace) {
      if (lines.length > 0) lines.push("");
      lines.push(`📍 <b>${escapeHtml(t.placeName)}</b>`);
      currentPlace = t.placeName;
    }

    const hhmm = t.localTime.slice(0, 5);
    const head = `• ${WEEKDAY_RU[t.dayOfWeek] ?? weekdayName(t.dayOfWeek)} ` +
      `${hhmm} — <b>${escapeHtml(t.title)}</b>`;
    const caps: string[] = [];
    if (t.capacity != null) caps.push(`мест ${t.capacity}`);
    if (t.reserveCapacity != null) caps.push(`резерв ${t.reserveCapacity}`);
    if (caps.length > 0) lines.push(`${head} <i>(${caps.join(", ")})</i>`);
    else lines.push(head);

    const occs = nextOccurrencesUtc({
      dayOfWeek: t.dayOfWeek,
      localTime: localTimeToDate(t.localTime),
      timezone: t.placeTimezone,
      fromUtc: now,
      daysAhead: 21,
    }).slice(0, 3);
    if (occs.length > 0) {
      lines.push(
        `   ↳ ${occs.map((o) => formatNext(o, t.placeTimezone)).join(" · ")}`,
      );
    }
  }

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}
