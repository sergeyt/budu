import { sql } from "./client.ts";

export type Place = {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  infoUrl: string | null;
};

export async function findPlaceById(id: string): Promise<Place | null> {
  const rows = await sql<Place[]>`
    SELECT id, name, description, location, "infoUrl"
    FROM "Place"
    WHERE id = ${id}
    LIMIT 1
  `;
  return rows[0] ?? null;
}

/**
 * Upsert the TELEGRAM channel binding for a (place, chatId) pair.
 * Idempotent: re-running on an already-linked chat is a no-op + returns the
 * existing row.
 */
export async function linkTelegramChatToPlace(
  placeId: string,
  chatId: number,
  label: string | null,
): Promise<void> {
  const target = String(chatId);
  await sql`
    INSERT INTO "PlaceNotificationChannel"
      (id, "placeId", type, target, label, "createdAt", "updatedAt")
    VALUES
      (gen_random_uuid()::text, ${placeId}, 'TELEGRAM',
       ${target}, ${label}, NOW(), NOW())
    ON CONFLICT ("placeId", type, target) DO NOTHING
  `;
}

/** Removes the (place, chatId) TELEGRAM binding. Returns true if a row was deleted. */
export async function unlinkTelegramChatFromPlace(
  placeId: string,
  chatId: number,
): Promise<boolean> {
  const target = String(chatId);
  const rows = await sql`
    DELETE FROM "PlaceNotificationChannel"
    WHERE "placeId" = ${placeId}
      AND type = 'TELEGRAM'
      AND target = ${target}
    RETURNING id
  `;
  return rows.length > 0;
}

/** All places this Telegram chat is linked to as a TELEGRAM notification channel. */
export async function placesLinkedToChat(chatId: number): Promise<Place[]> {
  const target = String(chatId);
  return await sql<Place[]>`
    SELECT p.id, p.name, p.description, p.location, p."infoUrl"
    FROM "Place" p
    JOIN "PlaceNotificationChannel" c
      ON c."placeId" = p.id
     AND c.type = 'TELEGRAM'
     AND c.target = ${target}
    ORDER BY p.name
  `;
}
