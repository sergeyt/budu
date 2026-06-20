import type { Context } from "grammy";
import { api } from "@/api/client.ts";
import {
  localTimeToDate,
  nextOccurrencesUtc,
  weekdayName,
} from "@/services/time.ts";
import { localeFrom, tr } from "@/i18n.ts";

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

function formatNext(occUtc: Date, zone: string, locale: string): string {
  const fmt = new Intl.DateTimeFormat(locale, {
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

  const rows = await api.templates.listByChat(chatId);
  if (rows.length === 0) {
    await ctx.reply(tr(ctx, "templates.empty"), { parse_mode: "HTML" });
    return;
  }

  const now = new Date();
  const locale = localeFrom(ctx);
  const fmtLocale = locale === "ru" ? "ru-RU" : "en-US";
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
    if (t.capacity != null) {
      caps.push(
        locale === "ru" ? `мест ${t.capacity}` : `cap ${t.capacity}`,
      );
    }
    if (t.reserveCapacity != null) {
      caps.push(
        locale === "ru"
          ? `резерв ${t.reserveCapacity}`
          : `waitlist ${t.reserveCapacity}`,
      );
    }
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
        `   ↳ ${occs.map((o) => formatNext(o, t.placeTimezone, fmtLocale)).join(" · ")}`,
      );
    }
  }

  await ctx.reply(lines.join("\n"), {
    parse_mode: "HTML",
    link_preview_options: { is_disabled: true },
  });
}
