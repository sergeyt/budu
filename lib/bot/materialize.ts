import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { nextOccurrencesUtc } from "@/lib/templates";
import type { MaterializeResultDto } from "@/lib/bot/types";

const HORIZON_DAYS = 8;

export async function materializeUpcoming(
  now: Date = new Date(),
): Promise<MaterializeResultDto> {
  const templates = await prisma.eventTemplate.findMany({
    where: { enabled: true },
    include: { place: { select: { timezone: true } } },
    orderBy: [{ place: { name: "asc" } }, { title: "asc" }],
  });

  const result: MaterializeResultDto = {
    scanned: templates.length,
    inserted: 0,
    errors: [],
  };

  for (const tpl of templates) {
    try {
      const occs = nextOccurrencesUtc({
        dayOfWeek: tpl.dayOfWeek,
        localTime: tpl.localTime,
        timezone: tpl.place.timezone,
        fromUtc: now,
        daysAhead: HORIZON_DAYS,
      });
      for (const startAt of occs) {
        const inserted = await insertOccurrence(tpl, startAt);
        if (inserted) {
          result.inserted++;
        }
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
  tpl: {
    id: string;
    title: string;
    description: string | null;
    infoUrl: string | null;
    durationMinutes: number | null;
    capacity: number | null;
    reserveCapacity: number | null;
    placeId: string;
  },
  startAt: Date,
): Promise<boolean> {
  const id = `ev_${crypto.randomUUID().replace(/-/g, "")}`;
  try {
    await prisma.event.create({
      data: {
        id,
        title: tpl.title,
        description: tpl.description,
        infoUrl: tpl.infoUrl,
        startAt,
        durationMinutes: tpl.durationMinutes,
        placeId: tpl.placeId,
        templateId: tpl.id,
        capacity: tpl.capacity,
        reserveCapacity: tpl.reserveCapacity,
      },
    });
    return true;
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      return false;
    }
    throw err;
  }
}
