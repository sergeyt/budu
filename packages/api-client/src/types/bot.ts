/** Wire DTOs from `/api/internal/bot/*` (dates as ISO strings over HTTP). */

export type BotUser = {
  id: string;
  name: string | null;
  telegramUserId: string | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
};

export type BotPlace = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  infoUrl: string | null;
};

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  placeId: string;
  placeName: string;
  placeTimezone: string;
};

export type AnnounceableEvent = EventRow & {
  announceOffsetMinutes: number;
  announcements: Array<{ chatId: string }> | null;
};

export type ParticipantRow = {
  userId: string;
  status: "CONFIRMED" | "RESERVED";
  createdAt: Date;
  displayName: string;
};

export type AnnouncementRef = {
  chatId: string;
  messageId: number;
  lastRenderedAt: string;
  lastSignature: string;
};

export type TelegramChannel = {
  target: string;
  label: string | null;
};

export type TemplateRow = {
  id: string;
  placeId: string;
  placeName: string;
  placeTimezone: string;
  title: string;
  description: string | null;
  infoUrl: string | null;
  dayOfWeek: number;
  localTime: string;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  announceOffsetMinutes: number;
  enabled: boolean;
};

export type RegisterOutcome =
  | { ok: true; status: "CONFIRMED" | "RESERVED"; alreadyRegistered: false }
  | { ok: true; status: "CONFIRMED" | "RESERVED"; alreadyRegistered: true }
  | {
      ok: false;
      reason: "FULL" | "EVENT_NOT_FOUND" | "WINDOW_CLOSED";
    };

export type CancelOutcome = {
  unregistered: boolean;
  promotedUserId: string | null;
};

export type MaterializeResult = {
  scanned: number;
  inserted: number;
  errors: Array<{ templateId: string; error: string }>;
};

export type CreateTemplateBody = {
  title: string;
  dayOfWeek: number;
  localTime: string;
  durationMinutes?: number | null;
  capacity?: number | null;
  reserveCapacity?: number | null;
  announceOffsetMinutes?: number;
};

type EventDto = Omit<EventRow, "startAt"> & { startAt: string };

export function parseEvent(d: EventDto): EventRow {
  return { ...d, startAt: new Date(d.startAt) };
}

export function parseAnnounceable(
  d: EventDto & {
    announceOffsetMinutes: number;
    announcements: Array<{ chatId: string }> | null;
  },
): AnnounceableEvent {
  return {
    ...parseEvent(d),
    announceOffsetMinutes: d.announceOffsetMinutes,
    announcements: d.announcements,
  };
}

export function parseParticipant(
  d: Omit<ParticipantRow, "createdAt"> & { createdAt: string },
): ParticipantRow {
  return { ...d, createdAt: new Date(d.createdAt) };
}
