import { sql } from "./client.ts";

export type TemplateRow = {
  id: string;
  placeId: string;
  placeName: string;
  placeTimezone: string;
  title: string;
  description: string | null;
  infoUrl: string | null;
  dayOfWeek: number;
  /**
   * "HH:MM:SS". We pull it as TEXT via `to_char(...)` because postgresjs
   * surfaces TIME as a JS Date pinned to a runtime-dependent epoch and
   * we don't want that ambiguity polluting the materializer.
   */
  localTime: string;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  announceOffsetMinutes: number;
  enabled: boolean;
};

/** Enabled templates only — used by the materializer cron. */
export async function listActiveTemplates(): Promise<TemplateRow[]> {
  return await sql<TemplateRow[]>`
    SELECT
      t.id, t."placeId", p.name AS "placeName", p.timezone AS "placeTimezone",
      t.title, t.description, t."infoUrl", t."dayOfWeek",
      to_char(t."localTime", 'HH24:MI:SS') AS "localTime",
      t."durationMinutes", t.capacity, t."reserveCapacity",
      t."announceOffsetMinutes", t.enabled
    FROM "EventTemplate" t
    JOIN "Place" p ON p.id = t."placeId"
    WHERE t.enabled = true
    ORDER BY p.name, t.title
  `;
}

/** Templates whose place is linked to the given Telegram chat. */
export async function listTemplatesForChat(
  chatId: number,
): Promise<TemplateRow[]> {
  const target = String(chatId);
  return await sql<TemplateRow[]>`
    SELECT
      t.id, t."placeId", p.name AS "placeName", p.timezone AS "placeTimezone",
      t.title, t.description, t."infoUrl", t."dayOfWeek",
      to_char(t."localTime", 'HH24:MI:SS') AS "localTime",
      t."durationMinutes", t.capacity, t."reserveCapacity",
      t."announceOffsetMinutes", t.enabled
    FROM "EventTemplate" t
    JOIN "Place" p ON p.id = t."placeId"
    JOIN "PlaceNotificationChannel" c
      ON c."placeId" = t."placeId"
     AND c.type = 'TELEGRAM'
     AND c.target = ${target}
    ORDER BY p.name, t.title
  `;
}
