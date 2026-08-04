import { prisma } from "@/lib/prisma";
import { localTimeToDate } from "@/lib/templates";
import {
  parseTemplatesMarkdown,
  type TemplateMarkdownFields,
  type TemplateMarkdownParseError,
} from "@/lib/templateMarkdown";

export type ImportTemplatesResult = {
  created: number;
  updated: number;
  deleted: number;
  templates: Awaited<ReturnType<typeof prisma.eventTemplate.findMany>>;
};

export type ImportTemplatesFailure = {
  errors: TemplateMarkdownParseError[];
};

/**
 * Apply a Markdown schedule document to a place.
 *
 * - Entries with an `id` that belongs to this place are updated.
 * - Other entries are created (unknown/foreign ids are ignored).
 * - When `prune` is true, templates missing from the document are deleted.
 */
export async function importTemplatesMarkdown(
  placeId: string,
  markdown: string,
  opts: { prune: boolean },
): Promise<
  | { ok: true; result: ImportTemplatesResult }
  | { ok: false; failure: ImportTemplatesFailure }
> {
  const parsed = parseTemplatesMarkdown(markdown);
  if (!parsed.ok) {
    return { ok: false, failure: { errors: parsed.errors } };
  }

  const existing = await prisma.eventTemplate.findMany({
    where: { placeId },
    select: { id: true },
  });
  const existingIds = new Set(existing.map((t) => t.id));

  const result = await prisma.$transaction(async (tx) => {
    let created = 0;
    let updated = 0;
    const keptIds = new Set<string>();

    for (const entry of parsed.templates) {
      const data = toPrismaData(entry);
      if (entry.id && existingIds.has(entry.id)) {
        await tx.eventTemplate.update({
          where: { id: entry.id },
          data,
        });
        keptIds.add(entry.id);
        updated += 1;
      } else {
        const row = await tx.eventTemplate.create({
          data: { placeId, ...data },
        });
        keptIds.add(row.id);
        created += 1;
      }
    }

    let deleted = 0;
    if (opts.prune) {
      const toDelete = existing
        .map((t) => t.id)
        .filter((id) => !keptIds.has(id));
      if (toDelete.length > 0) {
        const del = await tx.eventTemplate.deleteMany({
          where: { placeId, id: { in: toDelete } },
        });
        deleted = del.count;
      }
    }

    const templates = await tx.eventTemplate.findMany({
      where: { placeId },
      orderBy: [
        { enabled: "desc" },
        { dayOfWeek: "asc" },
        { localTime: "asc" },
      ],
    });

    return { created, updated, deleted, templates };
  });

  return { ok: true, result };
}

function toPrismaData(entry: TemplateMarkdownFields) {
  return {
    title: entry.title,
    description: entry.description,
    infoUrl: entry.infoUrl,
    dayOfWeek: entry.dayOfWeek,
    localTime: localTimeToDate(entry.localTime),
    durationMinutes: entry.durationMinutes,
    capacity: entry.capacity,
    reserveCapacity: entry.reserveCapacity,
    announceOffsetMinutes: entry.announceOffsetMinutes,
    enabled: entry.enabled,
  };
}
