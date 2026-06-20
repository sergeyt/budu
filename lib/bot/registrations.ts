import { prisma } from "@/lib/prisma";
import { lockEventForRegistration } from "@/lib/locks";
import {
  decideRegistrationStatus,
  shouldPromoteFromWaitlist,
} from "@/lib/registration";
import { canRegisterNow } from "@/lib/util";
import type {
  AnnouncementRefDto,
  CancelOutcomeDto,
  RegisterOutcomeDto,
} from "@/lib/bot/types";

export async function getAnnouncements(
  eventId: string,
): Promise<AnnouncementRefDto[]> {
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { announcements: true },
  });
  if (!event?.announcements || !Array.isArray(event.announcements)) {
    return [];
  }
  return event.announcements as AnnouncementRefDto[];
}

export async function upsertAnnouncement(
  eventId: string,
  ref: AnnouncementRefDto,
): Promise<void> {
  await prisma.$transaction(async (tx) => {
    await lockEventForRegistration(tx, eventId);
    const event = await tx.event.findUnique({
      where: { id: eventId },
      select: { announcements: true },
    });
    const current = Array.isArray(event?.announcements)
      ? (event.announcements as AnnouncementRefDto[])
      : [];
    const next = [...current.filter((a) => a.chatId !== ref.chatId), ref];
    await tx.event.update({
      where: { id: eventId },
      data: { announcements: next },
    });
  });
}

export async function registerUserForEvent(
  eventId: string,
  userId: string,
): Promise<RegisterOutcomeDto> {
  return await prisma.$transaction(async (tx) => {
    await lockEventForRegistration(tx, eventId);

    const existing = await tx.registration.findUnique({
      where: { userId_eventId: { userId, eventId } },
      select: { status: true },
    });
    if (existing) {
      return {
        ok: true,
        status: existing.status,
        alreadyRegistered: true,
      };
    }

    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return { ok: false, reason: "EVENT_NOT_FOUND" };
    }
    if (!canRegisterNow(event.startAt)) {
      return { ok: false, reason: "WINDOW_CLOSED" };
    }

    const [confirmedCount, reserveCount] = await Promise.all([
      tx.registration.count({ where: { eventId, status: "CONFIRMED" } }),
      tx.registration.count({ where: { eventId, status: "RESERVED" } }),
    ]);

    const status = decideRegistrationStatus({
      confirmedCount,
      reserveCount,
      confirmedCap: event.capacity,
      reserveCap: event.reserveCapacity,
    });
    if (status === "FULL") {
      return { ok: false, reason: "FULL" };
    }

    await tx.registration.create({
      data: { userId, eventId, status },
    });
    return { ok: true, status, alreadyRegistered: false };
  });
}

export async function cancelRegistration(
  eventId: string,
  userId: string,
): Promise<CancelOutcomeDto> {
  return await prisma.$transaction(async (tx) => {
    await lockEventForRegistration(tx, eventId);

    const deleted = await tx.registration
      .delete({ where: { userId_eventId: { userId, eventId } } })
      .catch(() => null);
    if (!deleted) {
      return { unregistered: false, promotedUserId: null };
    }

    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event) {
      return { unregistered: true, promotedUserId: null };
    }

    const confirmedCount = await tx.registration.count({
      where: { eventId, status: "CONFIRMED" },
    });
    if (
      !shouldPromoteFromWaitlist({
        confirmedCount,
        confirmedCap: event.capacity,
      })
    ) {
      return { unregistered: true, promotedUserId: null };
    }

    const next = await tx.registration.findFirst({
      where: { eventId, status: "RESERVED" },
      orderBy: { createdAt: "asc" },
    });
    if (!next) {
      return { unregistered: true, promotedUserId: null };
    }

    await tx.registration.update({
      where: { id: next.id },
      data: { status: "CONFIRMED" },
    });
    return { unregistered: true, promotedUserId: next.userId };
  });
}
