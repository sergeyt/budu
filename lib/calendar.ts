import { prisma } from "@/lib/prisma";
import { errors } from "@/lib/error";
import { RegistrationStatus } from "@/types/model";

export { publicCalendarUrl } from "@/lib/calendarUrl";

export async function getPlaceForCalendar(placeId: string) {
  const place = await prisma.place.findUnique({ where: { id: placeId } });
  if (!place) {
    throw errors.placeNotFound();
  }
  return place;
}

export type CalendarEventDto = {
  id: string;
  title: string;
  description: string | null;
  startAt: string;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  status: string;
};

export async function listPlaceEventsInRange(opts: {
  placeId: string;
  from: Date;
  to: Date;
  includeCancelled?: boolean;
}): Promise<CalendarEventDto[]> {
  const events = await prisma.event.findMany({
    where: {
      placeId: opts.placeId,
      startAt: { gte: opts.from, lt: opts.to },
      ...(opts.includeCancelled ? {} : { status: "SCHEDULED" }),
    },
    orderBy: { startAt: "asc" },
  });
  return events.map((e) => ({
    id: e.id,
    title: e.title,
    description: e.description,
    startAt: e.startAt.toISOString(),
    durationMinutes: e.durationMinutes,
    capacity: e.capacity,
    reserveCapacity: e.reserveCapacity,
    status: e.status,
  }));
}

export type CalendarParticipantDto = {
  userId: string;
  status: "CONFIRMED" | "RESERVED";
  displayName: string;
  createdAt: string;
};

export async function getEventDetailForPlace(opts: {
  placeId: string;
  eventId: string;
  includeCancelled?: boolean;
}) {
  const event = await prisma.event.findFirst({
    where: {
      id: opts.eventId,
      placeId: opts.placeId,
      ...(opts.includeCancelled ? {} : { status: "SCHEDULED" }),
    },
    include: {
      place: { select: { timezone: true, name: true } },
      regs: {
        include: { user: { select: { name: true, image: true } } },
        orderBy: [{ status: "asc" }, { createdAt: "asc" }],
      },
    },
  });
  if (!event) {
    throw errors.eventNotFound();
  }

  const participants: CalendarParticipantDto[] = event.regs.map((r) => ({
    userId: r.userId,
    status: r.status as "CONFIRMED" | "RESERVED",
    displayName: (r.user.name || "Anonymous").trim(),
    createdAt: r.createdAt.toISOString(),
  }));

  const confirmed = participants.filter(
    (p) => p.status === RegistrationStatus.CONFIRMED,
  );
  const reserved = participants.filter(
    (p) => p.status === RegistrationStatus.RESERVED,
  );

  return {
    id: event.id,
    title: event.title,
    description: event.description,
    startAt: event.startAt.toISOString(),
    durationMinutes: event.durationMinutes,
    capacity: event.capacity,
    reserveCapacity: event.reserveCapacity,
    status: event.status,
    cancelReason: event.cancelReason,
    placeName: event.place.name,
    placeTimezone: event.place.timezone,
    participants: [...confirmed, ...reserved],
  };
}
