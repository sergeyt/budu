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
};

export async function findEventById(eventId: string): Promise<EventRow | null> {
  const rows = await sql<EventRow[]>`
    SELECT
      e.id, e.title, e.description, e."startAt", e."durationMinutes",
      e.capacity, e."reserveCapacity", e."placeId", p.name AS "placeName"
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
    SELECT
      e.id, e.title, e.description, e."startAt", e."durationMinutes",
      e.capacity, e."reserveCapacity", e."placeId", p.name AS "placeName"
    FROM "Event" e
    JOIN "Place" p ON p.id = e."placeId"
    WHERE e."placeId" = ${placeId}
      AND e."startAt" > NOW()
    ORDER BY e."startAt" ASC
    LIMIT 1
  `;
  return rows[0] ?? null;
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
