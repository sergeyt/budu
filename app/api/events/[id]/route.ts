import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import { UpdateEvent } from "@/lib/validation";
import { toDateTime } from "@/lib/util";
import { errorMiddleware, errors } from "@/lib/error";
import { getEventDetailForPlace } from "@/lib/calendar";

type Params = { id?: string };

export const GET = errorMiddleware<Params>(async (_req, ctx) => {
  const { userId } = await requireUser();
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw errors.missingParam("eventId");
  }
  const event = await prisma.event.findUnique({
    where: { id: eventId },
    select: { placeId: true },
  });
  if (!event) {
    throw errors.eventNotFound();
  }
  const allowed =
    (await isSuperAdmin(userId)) || (await isPlaceAdmin(userId, event.placeId));
  if (!allowed) {
    throw errors.forbidden();
  }
  return await getEventDetailForPlace({
    placeId: event.placeId,
    eventId,
    includeCancelled: true,
  });
});

export const PATCH = errorMiddleware<Params>(async (req, ctx) => {
  const { userId } = await requireUser();
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw errors.missingParam("eventId");
  }

  const existing = await prisma.event.findUnique({ where: { id: eventId } });
  if (!existing) {
    throw errors.eventNotFound();
  }
  const allowed =
    (await isSuperAdmin(userId)) ||
    (await isPlaceAdmin(userId, existing.placeId));
  if (!allowed) {
    throw errors.forbidden();
  }
  if (existing.status === "CANCELLED") {
    throw errors.eventCancelled();
  }

  const body = await req.json();
  const parsed = UpdateEvent.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("event", parsed.error.flatten());
  }

  const data: Record<string, unknown> = { ...parsed.data };
  if (parsed.data.startAt) {
    const startDate = toDateTime(parsed.data.startAt);
    if (!startDate.isValid) {
      throw errors.invalidStartAt();
    }
    data.startAt = startDate.toJSDate();
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data,
  });
  return NextResponse.json(event);
});
