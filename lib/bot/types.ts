/** JSON shapes returned by `/api/internal/bot/*`. Dates are ISO strings. */

export type BotUserDto = {
  id: string;
  name: string | null;
  telegramUserId: string | null;
  telegramUsername: string | null;
  telegramFirstName: string | null;
};

export type PlaceDto = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  infoUrl: string | null;
};

export type EventDto = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  placeId: string;
  placeName: string;
  placeTimezone: string;
};

export type AnnounceableEventDto = EventDto & {
  announceOffsetMinutes: number;
  announcements: AnnouncementRefDto[] | null;
};

export type ParticipantDto = {
  userId: string;
  status: "CONFIRMED" | "RESERVED";
  createdAt: string;
  displayName: string;
};

export type AnnouncementRefDto = {
  chatId: string;
  messageId: number;
  lastRenderedAt: string;
  lastSignature: string;
};

export type TelegramChannelDto = {
  target: string;
  label: string | null;
};

export type TemplateDto = {
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

export type RegisterOutcomeDto =
  | { ok: true; status: "CONFIRMED" | "RESERVED"; alreadyRegistered: false }
  | { ok: true; status: "CONFIRMED" | "RESERVED"; alreadyRegistered: true }
  | {
      ok: false;
      reason: "FULL" | "EVENT_NOT_FOUND" | "WINDOW_CLOSED";
    };

export type CancelOutcomeDto = {
  unregistered: boolean;
  promotedUserId: string | null;
};

export type MaterializeResultDto = {
  scanned: number;
  inserted: number;
  errors: Array<{ templateId: string; error: string }>;
};
