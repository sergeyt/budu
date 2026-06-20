import { sql } from "./client.ts";

export type TelegramChannel = {
  target: string;
  label: string | null;
};

/**
 * TELEGRAM notification targets for an event. Event-level channels override
 * place-level ones of the same type — mirrors `lib/notifications/effectiveChannels.ts`.
 */
export async function listTelegramChannelsForEvent(
  eventId: string,
): Promise<TelegramChannel[]> {
  const eventChannels = await sql<TelegramChannel[]>`
    SELECT c.target, c.label
    FROM "EventNotificationChannel" c
    WHERE c."eventId" = ${eventId} AND c.type = 'TELEGRAM'
  `;
  if (eventChannels.length > 0) {
    return eventChannels;
  }
  return await sql<TelegramChannel[]>`
    SELECT c.target, c.label
    FROM "PlaceNotificationChannel" c
    JOIN "Event" e ON e."placeId" = c."placeId"
    WHERE e.id = ${eventId} AND c.type = 'TELEGRAM'
  `;
}
