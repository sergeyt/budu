import { ApiError, apiFetch } from "./client.ts";
import {
  type AnnounceableEvent,
  type EventRow,
  type ParticipantRow,
  parseAnnounceable,
  parseEvent,
  parseParticipant,
} from "./types.ts";

export type { EventRow, AnnounceableEvent, ParticipantRow };

export async function findEventById(eventId: string): Promise<EventRow | null> {
  try {
    const dto = await apiFetch<
      Omit<EventRow, "startAt"> & { startAt: string }
    >(`/api/internal/bot/events/${eventId}`);
    return parseEvent(dto);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function findNextEventForPlace(
  placeId: string,
): Promise<EventRow | null> {
  const dto = await apiFetch<
    (Omit<EventRow, "startAt"> & { startAt: string }) | null
  >(`/api/internal/bot/events/next?placeId=${encodeURIComponent(placeId)}`);
  return dto ? parseEvent(dto) : null;
}

export async function listEventsDueForAnnouncement(
  now: Date = new Date(),
): Promise<AnnounceableEvent[]> {
  const rows = await apiFetch<
    Array<
      Omit<AnnounceableEvent, "startAt"> & {
        startAt: string;
        announceOffsetMinutes: number;
        announcements: Array<{ chatId: string }> | null;
      }
    >
  >(
    `/api/internal/bot/events/due-for-announcement?now=${
      encodeURIComponent(now.toISOString())
    }`,
  );
  return rows.map(parseAnnounceable);
}

export async function listParticipants(
  eventId: string,
): Promise<ParticipantRow[]> {
  const rows = await apiFetch<
    Array<Omit<ParticipantRow, "createdAt"> & { createdAt: string }>
  >(`/api/internal/bot/events/${eventId}/participants`);
  return rows.map(parseParticipant);
}
