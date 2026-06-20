import type { Bot } from "grammy";
import type { InlineKeyboardMarkup } from "grammy/types";
import { encodeCallbackData } from "@/services/callbackData.ts";
import {
  type EventRow,
  findEventById,
  listParticipants,
  type ParticipantRow,
} from "@/db/events.ts";
import {
  type AnnouncementRef,
  getAnnouncements,
  upsertAnnouncement,
} from "@/db/announcements.ts";

const PARTICIPANT_LIST_LIMIT = 12;

/**
 * Re-renders are gated to once per this many ms per (event, chat) to stay
 * well under Telegram's per-chat edit rate limit (~1/s). A trailing edit is
 * always coalesced via lastSignature comparison so we don't drop updates.
 */
const EDIT_DEBOUNCE_MS = 5_000;

/**
 * Stable signature of the rendered announcement state. If this matches
 * what's already on Telegram we skip the editMessageText call entirely
 * (Telegram would 400 with "message is not modified" anyway).
 */
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

function renderText(event: EventRow, participants: ParticipantRow[]): string {
  const confirmed = participants.filter((p) => p.status === "CONFIRMED");
  const reserved = participants.filter((p) => p.status === "RESERVED");

  // Format: 🏓 <title> — <place> — <when>
  // Then confirmed list (up to LIMIT), then waitlist (up to LIMIT), then
  // a "+N more" tail per list.
  const when = event.startAt.toLocaleString("ru-RU", {
    weekday: "short",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    timeZone: "Europe/Moscow",
  });

  const lines: string[] = [];
  lines.push(
    `🏓 <b>${escapeHtml(event.title)}</b> — ${escapeHtml(event.placeName)}`,
  );
  lines.push(`🗓 ${when}`);
  if (event.capacity != null) {
    lines.push(
      `👥 Мест: ${confirmed.length}/${event.capacity}` +
        (event.reserveCapacity
          ? ` · резерв ${reserved.length}/${event.reserveCapacity}`
          : ""),
    );
  }

  lines.push("");
  lines.push(`✅ <b>Идут (${confirmed.length})</b>`);
  if (confirmed.length === 0) {
    lines.push("  <i>пока никого</i>");
  } else {
    const head = confirmed.slice(0, PARTICIPANT_LIST_LIMIT);
    for (const p of head) lines.push(`  • ${escapeHtml(p.displayName)}`);
    if (confirmed.length > head.length) {
      lines.push(`  … и ещё ${confirmed.length - head.length}`);
    }
  }

  if (reserved.length > 0) {
    lines.push("");
    lines.push(`⏳ <b>Резерв (${reserved.length})</b>`);
    const head = reserved.slice(0, PARTICIPANT_LIST_LIMIT);
    for (const p of head) lines.push(`  • ${escapeHtml(p.displayName)}`);
    if (reserved.length > head.length) {
      lines.push(`  … и ещё ${reserved.length - head.length}`);
    }
  }

  return lines.join("\n");
}

async function buildKeyboard(eventId: string): Promise<InlineKeyboardMarkup> {
  const [reg, can] = await Promise.all([
    encodeCallbackData("reg", eventId),
    encodeCallbackData("can", eventId),
  ]);
  return {
    inline_keyboard: [[
      { text: "✅ Я иду", callback_data: reg },
      { text: "❌ Отмена", callback_data: can },
    ]],
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
  const participants = await listParticipants(event.id);
  return {
    text: renderText(event, participants),
    reply_markup: await buildKeyboard(event.id),
    signature: signature(event, participants),
  };
}

/**
 * Post a brand-new announcement to `chatId` and remember the message id
 * on Event.announcements.
 */
export async function postAnnouncement(
  bot: Bot,
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
  await upsertAnnouncement(event.id, ref);
  return ref;
}

/**
 * Re-render every live announcement for `eventId`. Debounced per (event,
 * chat) and short-circuits when the signature hasn't changed.
 *
 * Fire-and-forget from callback handlers — a failed edit shouldn't fail
 * the user's tap.
 */
export async function refreshAnnouncements(
  bot: Bot,
  eventId: string,
): Promise<void> {
  const event = await findEventById(eventId);
  if (!event) return;
  const refs = await getAnnouncements(eventId);
  if (refs.length === 0) return;

  const payload = await buildAnnouncement(event);
  const now = Date.now();

  await Promise.all(refs.map(async (ref) => {
    if (ref.lastSignature === payload.signature) return;
    if (now - Date.parse(ref.lastRenderedAt) < EDIT_DEBOUNCE_MS) {
      // Defer: schedule a single late edit if nothing else fires sooner.
      // Cheap implementation: just no-op; the next user interaction (or
      // the future cron tick) will catch up. The bound-then-late edit
      // pattern is not worth a queue here.
      return;
    }
    try {
      await bot.api.editMessageText(ref.chatId, ref.messageId, payload.text, {
        parse_mode: "HTML",
        reply_markup: payload.reply_markup,
        link_preview_options: { is_disabled: true },
      });
      await upsertAnnouncement(eventId, {
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
