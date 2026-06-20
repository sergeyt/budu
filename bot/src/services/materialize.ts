import { sql } from "@/db/client.ts";
import { listActiveTemplates, type TemplateRow } from "@/db/templates.ts";
import { localTimeToDate, nextOccurrencesUtc } from "@/services/time.ts";

/**
 * Materializer config. The tick frequency is independent — see `cron.ts`.
 * `HORIZON_DAYS` controls how far ahead we project Events from templates.
 * 8 days covers a weekly cadence with one extra day of buffer; the cron
 * tick will catch up if we miss a few minutes.
 */
const HORIZON_DAYS = 8;

export type MaterializeResult = {
  scanned: number; // templates considered
  inserted: number; // new Event rows created
  errors: Array<{ templateId: string; error: string }>;
};

/**
 * Insert one `Event` per upcoming occurrence of each active template.
 *
 * Idempotency is delegated to the unique constraint
 * `Event_templateId_startAt_key` — the planner returns 0 rows on the
 * conflict path and counts the actual inserts via RETURNING.
 *
 * Description / infoUrl / capacity are **snapshotted** from the template at
 * materialization time. Future edits to the template don't retroactively
 * mutate already-materialized Events; that matches user intuition (a
 * scheduled event is a thing of its own once it exists).
 */
export async function materializeUpcoming(
  now: Date = new Date(),
): Promise<MaterializeResult> {
  const templates = await listActiveTemplates();
  const result: MaterializeResult = {
    scanned: templates.length,
    inserted: 0,
    errors: [],
  };

  for (const tpl of templates) {
    try {
      const occs = nextOccurrencesUtc({
        dayOfWeek: tpl.dayOfWeek,
        localTime: localTimeToDate(tpl.localTime),
        timezone: tpl.placeTimezone,
        fromUtc: now,
        daysAhead: HORIZON_DAYS,
      });
      for (const startAt of occs) {
        const inserted = await insertOccurrence(tpl, startAt);
        if (inserted) result.inserted++;
      }
    } catch (err) {
      result.errors.push({
        templateId: tpl.id,
        error: err instanceof Error ? err.message : String(err),
      });
    }
  }
  return result;
}

async function insertOccurrence(
  tpl: TemplateRow,
  startAt: Date,
): Promise<boolean> {
  // gen_random_uuid()::text gives a stable shape (UUID, distinct from the
  // bot-only `tg_…` and the Next-side cuid prefixes) so origin is obvious
  // in psql.
  //
  // Send an ISO-with-Z string (not a Date) so Postgres strips the Z when
  // casting to TIMESTAMP and stores the same UTC wall clock that Prisma
  // assumes on readback. See the codec comment in `db/client.ts`.
  const startAtIso = startAt.toISOString();
  const rows = await sql<{ id: string }[]>`
    INSERT INTO "Event"
      (id, title, description, "infoUrl", "startAt", "durationMinutes",
       "placeId", "templateId", capacity, "reserveCapacity",
       "createdAt", "updatedAt")
    VALUES
      ('ev_' || replace(gen_random_uuid()::text, '-', ''),
       ${tpl.title}, ${tpl.description}, ${tpl.infoUrl},
       ${startAtIso}::timestamp, ${tpl.durationMinutes},
       ${tpl.placeId}, ${tpl.id},
       ${tpl.capacity}, ${tpl.reserveCapacity}, NOW(), NOW())
    ON CONFLICT ("templateId", "startAt") DO NOTHING
    RETURNING id
  `;
  return rows.length > 0;
}
