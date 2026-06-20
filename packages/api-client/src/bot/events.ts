import { ApiError, type ApiClient } from "../client.ts";
import {
  type AnnounceableEvent,
  type EventRow,
  type ParticipantRow,
  parseAnnounceable,
  parseEvent,
  parseParticipant,
} from "../types/bot.ts";

const PREFIX = "/api/internal/bot";

type EventDto = Omit<EventRow, "startAt"> & { startAt: string };

export function createBotEventsApi(client: ApiClient) {
  return {
    async findById(eventId: string): Promise<EventRow | null> {
      try {
        const dto = await client.fetch<EventDto>(`${PREFIX}/events/${eventId}`);
        return parseEvent(dto);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    async findNext(placeId: string): Promise<EventRow | null> {
      const dto = await client.fetch<EventDto | null>(
        `${PREFIX}/events/next?placeId=${encodeURIComponent(placeId)}`,
      );
      return dto ? parseEvent(dto) : null;
    },

    async listDueForAnnouncement(now: Date = new Date()): Promise<
      AnnounceableEvent[]
    > {
      const rows = await client.fetch<
        Array<
          Omit<AnnounceableEvent, "startAt"> & {
            startAt: string;
          }
        >
      >(
        `${PREFIX}/events/due-for-announcement?now=${
          encodeURIComponent(now.toISOString())
        }`,
      );
      return rows.map(parseAnnounceable);
    },

    async listParticipants(eventId: string): Promise<ParticipantRow[]> {
      const rows = await client.fetch<
        Array<Omit<ParticipantRow, "createdAt"> & { createdAt: string }>
      >(`${PREFIX}/events/${eventId}/participants`);
      return rows.map(parseParticipant);
    },
  };
}

export type BotEventsApi = ReturnType<typeof createBotEventsApi>;
