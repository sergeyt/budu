import { sql } from "./client.ts";

export type AnnouncementRef = {
  chatId: string;
  messageId: number;
  lastRenderedAt: string;
  lastSignature: string;
};

export async function getAnnouncements(
  eventId: string,
): Promise<AnnouncementRef[]> {
  const rows = await sql<{ announcements: AnnouncementRef[] | null }[]>`
    SELECT announcements FROM "Event" WHERE id = ${eventId} LIMIT 1
  `;
  return rows[0]?.announcements ?? [];
}

/**
 * Replace the announcement entry for `(chatId)` with the given ref. If no
 * entry exists yet, append. Concurrent updates are serialized by the same
 * advisory lock used for registration so we don't race the participant
 * count against the rendered text.
 */
export async function upsertAnnouncement(
  eventId: string,
  ref: AnnouncementRef,
): Promise<void> {
  await sql.begin(async (tx) => {
    await tx`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`event:register:${eventId}`}, 0)
      )
    `;
    const rows = await tx<{ announcements: AnnouncementRef[] | null }[]>`
      SELECT announcements FROM "Event" WHERE id = ${eventId} LIMIT 1
    `;
    const current = rows[0]?.announcements ?? [];
    const next = [
      ...current.filter((a) => a.chatId !== ref.chatId),
      ref,
    ];
    await tx`
      UPDATE "Event"
      SET announcements = ${sql.json(next)}, "updatedAt" = NOW()
      WHERE id = ${eventId}
    `;
  });
}
