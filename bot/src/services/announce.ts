import type { Bot } from "grammy";
import type { BotContext } from "@/context.ts";
import type { InlineKeyboardMarkup } from "grammy/types";
import { encodeCallbackData } from "@/services/callbackData.ts";
import { webAppBaseUrl } from "@/config.ts";
import { t, type Locale } from "@/i18n.ts";
import {
  api,
  type AnnouncementRef,
  type EventRow,
  type ParticipantRow,
} from "@/api/client.ts";

const PARTICIPANT_LIST_LIMIT = 12;

/** Stay under Telegram's ~1 edit/sec per chat flood limit. */
const EDIT_DEBOUNCE_MS = 5_000;

const pendingRefreshes = new Map<string, ReturnType<typeof setTimeout>>();

function signature(
  event: EventRow,
  participants: ParticipantRow[],
): string {
  const counts = participants.reduce(
    (acc, p) => {
      acc[p.status] += 1;
      return acc;
    },
    { CONFIRMED: 0, RESERVED: 0 } as Record<"CONFIRMED" | "RESERVED", number>,
  );
  const head = participants
    .slice(0, PARTICIPANT_LIST_LIMIT)
    .map((p) => `${p.status[0]}:${p.userId}`)
    .join(",");
  return `${event.title}|${event.startAt.toISOString()}|${
    event.capacity ?? "∞"
  }|${
    event.reserveCapacity ?? "∞"
  }|c${counts.CONFIRMED}|r${counts.RESERVED}|${head}`;
}

function escapeHtml(s: string): string {
  return s
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
}

function formatWhen(event: EventRow): string {
  return event.startAt.toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: event.placeTimezone,
  });
}

export function renderParticipantList(
  participants: ParticipantRow[],
  opts: { limit?: number } = {},
): string {
  const limit = opts.limit ?? PARTICIPANT_LIST_LIMIT;
  const confirmed = participants.filter((p) => p.status === "CONFIRMED");
  const reserved = participants.filter((p) => p.status === "RESERVED");

  const lines: string[] = [];
  lines.push(`✅ <b>Идут (${confirmed.length})</b>`);
  if (confirmed.length === 0) {
    lines.push("  <i>пока никого</i>");
  } else {
    for (const p of confirmed.slice(0, limit)) {
      lines.push(`  • ${escapeHtml(p.displayName)}`);
    }
    if (confirmed.length > limit) {
      lines.push(`  … и ещё ${confirmed.length - limit}`);
    }
  }

  if (reserved.length > 0) {
    lines.push("");
    lines.push(`⏳ <b>Резерв (${reserved.length})</b>`);
    for (const p of reserved.slice(0, limit)) {
      lines.push(`  • ${escapeHtml(p.displayName)}`);
    }
    if (reserved.length > limit) {
      lines.push(`  … и ещё ${reserved.length - limit}`);
    }
  }

  return lines.join("\n");
}

function renderText(event: EventRow, participants: ParticipantRow[]): string {
  const confirmed = participants.filter((p) => p.status === "CONFIRMED");
  const reserved = participants.filter((p) => p.status === "RESERVED");

  const lines: string[] = [];
  lines.push(
    `🏓 <b>${escapeHtml(event.title)}</b> — ${escapeHtml(event.placeName)}`,
  );
  lines.push(`🗓 ${formatWhen(event)}`);
  if (event.capacity != null) {
    lines.push(
      `👥 Мест: ${confirmed.length}/${event.capacity}` +
        (event.reserveCapacity
          ? ` · резерв ${reserved.length}/${event.reserveCapacity}`
          : ""),
    );
  }

  lines.push("");
  lines.push(renderParticipantList(participants));
  return lines.join("\n");
}

async function buildKeyboard(
  eventId: string,
  locale: Locale = "ru",
): Promise<InlineKeyboardMarkup> {
  const [reg, wai, can] = await Promise.all([
    encodeCallbackData("reg", eventId),
    encodeCallbackData("wai", eventId),
    encodeCallbackData("can", eventId),
  ]);
  const listUrl = `${webAppBaseUrl()}/tg/events/${eventId}`;
  return {
    inline_keyboard: [
      [
        { text: t(locale, "keyboard.register"), callback_data: reg },
        { text: t(locale, "keyboard.waitlist"), callback_data: wai },
      ],
      [
        { text: t(locale, "keyboard.cancel"), callback_data: can },
        { text: t(locale, "keyboard.list"), web_app: { url: listUrl } },
      ],
    ],
  };
}

export type AnnouncePayload = {
  text: string;
  reply_markup: InlineKeyboardMarkup;
  signature: string;
};

export async function buildAnnouncement(
  event: EventRow,
): Promise<AnnouncePayload> {
  const participants = await api.events.listParticipants(event.id);
  return {
    text: renderText(event, participants),
    reply_markup: await buildKeyboard(event.id),
    signature: signature(event, participants),
  };
}

export async function postAnnouncement(
  bot: Bot<BotContext>,
  event: EventRow,
  chatId: number | string,
): Promise<AnnouncementRef> {
  const payload = await buildAnnouncement(event);
  const sent = await bot.api.sendMessage(chatId, payload.text, {
    parse_mode: "HTML",
    reply_markup: payload.reply_markup,
    link_preview_options: { is_disabled: true },
  });
  const ref: AnnouncementRef = {
    chatId: String(chatId),
    messageId: sent.message_id,
    lastRenderedAt: new Date().toISOString(),
    lastSignature: payload.signature,
  };
  await api.announcements.upsert(event.id, ref);
  return ref;
}

/**
 * Coalesce rapid registration taps into one trailing edit ≥5s after the
 * last change. Signature comparison still skips no-op edits.
 */
export function scheduleAnnouncementRefresh(
  bot: Bot<BotContext>,
  eventId: string,
): void {
  const existing = pendingRefreshes.get(eventId);
  if (existing) {
    clearTimeout(existing);
  }
  pendingRefreshes.set(
    eventId,
    setTimeout(() => {
      pendingRefreshes.delete(eventId);
      void refreshAnnouncements(bot, eventId).catch((err) => {
        console.error("[announce] scheduled refresh failed", err);
      });
    }, EDIT_DEBOUNCE_MS),
  );
}

export async function refreshAnnouncements(
  bot: Bot<BotContext>,
  eventId: string,
): Promise<void> {
  const event = await api.events.findById(eventId);
  if (!event) {
    return;
  }
  const refs = await api.announcements.list(eventId);
  if (refs.length === 0) {
    return;
  }

  const payload = await buildAnnouncement(event);
  const now = Date.now();

  await Promise.all(refs.map(async (ref) => {
    if (ref.lastSignature === payload.signature) {
      return;
    }
    if (now - Date.parse(ref.lastRenderedAt) < EDIT_DEBOUNCE_MS) {
      return;
    }
    try {
      await bot.api.editMessageText(ref.chatId, ref.messageId, payload.text, {
        parse_mode: "HTML",
        reply_markup: payload.reply_markup,
        link_preview_options: { is_disabled: true },
      });
      await api.announcements.upsert(eventId, {
        ...ref,
        lastRenderedAt: new Date().toISOString(),
        lastSignature: payload.signature,
      });
    } catch (err) {
      console.error("[announce] edit failed", {
        eventId,
        chatId: ref.chatId,
        messageId: ref.messageId,
        err: err instanceof Error ? err.message : String(err),
      });
    }
  }));
}

/** Full participant list for the "Список" button (no truncation). */
export async function buildFullListMessage(eventId: string): Promise<string> {
  const event = await api.events.findById(eventId);
  if (!event) {
    return "Событие не найдено.";
  }
  const participants = await api.events.listParticipants(eventId);
  const lines = [
    `🏓 <b>${escapeHtml(event.title)}</b>`,
    `🗓 ${formatWhen(event)}`,
    "",
    renderParticipantList(participants, { limit: 500 }),
  ];
  return lines.join("\n");
}
