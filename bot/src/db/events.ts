import { sql } from "./client.ts";

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

/** Event + announce timing fields used by the scheduler. */
export type AnnounceableEvent = EventRow & {
  announceOffsetMinutes: number;
  announcements: Array<{ chatId: string }> | null;
};

const EVENT_COLUMNS = `
  e.id, e.title, e.description, e."startAt", e."durationMinutes",
  e.capacity, e."reserveCapacity", e."placeId", p.name AS "placeName",
  p.timezone AS "placeTimezone"
`;

export async function findEventById(eventId: string): Promise<EventRow | null> {
  const rows = await sql<EventRow[]>`
    SELECT ${sql.unsafe(EVENT_COLUMNS)}
    FROM "Event" e
    JOIN "Place" p ON p.id = e."placeId"
    WHERE e.id = ${eventId}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/** Next upcoming event for a place (startAt > now). */
export async function findNextEventForPlace(
  placeId: string,
): Promise<EventRow | null> {
  const rows = await sql<EventRow[]>`
    SELECT ${sql.unsafe(EVENT_COLUMNS)}
    FROM "Event" e
    JOIN "Place" p ON p.id = e."placeId"
    WHERE e."placeId" = ${placeId}
      AND e."startAt" > NOW()
    ORDER BY e."startAt" ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Events whose announce window has opened but the event hasn't started yet.
 * `announceOffsetMinutes` comes from the materializing template when present,
 * otherwise defaults to 24h (same as EventTemplate's column default).
 */
export async function listEventsDueForAnnouncement(
  now: Date = new Date(),
): Promise<AnnounceableEvent[]> {
  const nowIso = now.toISOString();
  return await sql<AnnounceableEvent[]>`
    SELECT
      ${sql.unsafe(EVENT_COLUMNS)},
      COALESCE(t."announceOffsetMinutes", 1440) AS "announceOffsetMinutes",
      e.announcements
    FROM "Event" e
    JOIN "Place" p ON p.id = e."placeId"
    LEFT JOIN "EventTemplate" t ON t.id = e."templateId"
    WHERE e."startAt" > ${nowIso}::timestamp
      AND e."startAt" - (COALESCE(t."announceOffsetMinutes", 1440) * INTERVAL '1 minute')
          <= ${nowIso}::timestamp
    ORDER BY e."startAt" ASC
  `;
}

export type ParticipantRow = {
  userId: string;
  status: "CONFIRMED" | "RESERVED";
  createdAt: Date;
  displayName: string;
};

/**
 * Ordered participants: CONFIRMED first (by signup time), RESERVED after.
 * `displayName` coalesces name → telegramFirstName → telegramUsername → email.
 */
export async function listParticipants(
  eventId: string,
): Promise<ParticipantRow[]> {
  return await sql<ParticipantRow[]>`
    SELECT
      r."userId",
      r.status,
      r."createdAt",
      COALESCE(
        NULLIF(u.name, ''),
        NULLIF(u."telegramFirstName", ''),
        NULLIF(u."telegramUsername", ''),
        NULLIF(u.email, ''),
        'Anonymous'
      ) AS "displayName"
    FROM "Registration" r
    JOIN "User" u ON u.id = r."userId"
    WHERE r."eventId" = ${eventId}
    ORDER BY r.status ASC, r."createdAt" ASC
  `;
}
