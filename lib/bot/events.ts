import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import type {
  AnnounceableEventDto,
  AnnouncementRefDto,
  EventDto,
  ParticipantDto,
} from "@/lib/bot/types";
import { displayNameForUser } from "@/lib/bot/participants";

function toEventDto(row: {
  id: string;
  title: string;
  description: string | null;
  startAt: Date;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  placeId: string;
  place: { name: string; timezone: string };
}): EventDto {
  return {
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.startAt.toISOString(),
    durationMinutes: row.durationMinutes,
    capacity: row.capacity,
    reserveCapacity: row.reserveCapacity,
    placeId: row.placeId,
    placeName: row.place.name,
    placeTimezone: row.place.timezone,
  };
}

const eventInclude = {
  place: { select: { name: true, timezone: true } },
} as const;

export async function findEventById(eventId: string): Promise<EventDto | null> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    include: eventInclude,
  });
  return event ? toEventDto(event) : null;
}

export async function findNextEventForPlace(
  placeId: string,
): Promise<EventDto | null> {
  const event = await prisma.event.findFirst({
    where: { placeId, startAt: { gt: new Date() } },
    orderBy: { startAt: "asc" },
    include: eventInclude,
  });
  return event ? toEventDto(event) : null;
}

type DueRow = {
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
  announceOffsetMinutes: number;
  announcements: AnnouncementRefDto[] | null;
};

export async function listEventsDueForAnnouncement(
  now: Date = new Date(),
): Promise<AnnounceableEventDto[]> {
  const nowIso = now.toISOString();
  const rows = await prisma.$queryRaw<DueRow[]>(Prisma.sql`
    SELECT
      e.id, e.title, e.description, e."startAt", e."durationMinutes",
      e.capacity, e."reserveCapacity", e."placeId",
      p.name AS "placeName", p.timezone AS "placeTimezone",
      COALESCE(t."announceOffsetMinutes", 1440) AS "announceOffsetMinutes",
      e.announcements
    FROM "Event" e
    JOIN "Place" p ON p.id = e."placeId"
    LEFT JOIN "EventTemplate" t ON t.id = e."templateId"
    WHERE e."startAt" > ${nowIso}::timestamp
      AND e."startAt" - (COALESCE(t."announceOffsetMinutes", 1440) * INTERVAL '1 minute')
          <= ${nowIso}::timestamp
    ORDER BY e."startAt" ASC
  `);

  return rows.map((row) => ({
    id: row.id,
    title: row.title,
    description: row.description,
    startAt: row.startAt.toISOString(),
    durationMinutes: row.durationMinutes,
    capacity: row.capacity,
    reserveCapacity: row.reserveCapacity,
    placeId: row.placeId,
    placeName: row.placeName,
    placeTimezone: row.placeTimezone,
    announceOffsetMinutes: row.announceOffsetMinutes,
    announcements: row.announcements,
  }));
}

export async function listParticipants(
  eventId: string,
): Promise<ParticipantDto[]> {
  const rows = await prisma.registration.findMany({
    where: { eventId },
    include: { user: true },
    orderBy: [{ status: "asc" }, { createdAt: "asc" }],
  });
  return rows.map((r) => ({
    userId: r.userId,
    status: r.status,
    createdAt: r.createdAt.toISOString(),
    displayName: displayNameForUser(r.user),
  }));
}
