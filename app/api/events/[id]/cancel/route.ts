import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireUser, isPlaceAdmin, isSuperAdmin } from "@/lib/api-auth";
import { CancelEvent } from "@/lib/validation";
import { errorMiddleware, errors } from "@/lib/error";
import { notifyEventCancelled } from "@/lib/notifications/cancel";

type Params = { id?: string };

export const POST = errorMiddleware<Params>(async (req, ctx) => {
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
    throw errors.eventAlreadyCancelled();
  }

  const body = await req.json();
  const parsed = CancelEvent.safeParse(body);
  if (!parsed.success) {
    throw errors.invalidPayload("cancel", parsed.error.flatten());
  }

  const event = await prisma.event.update({
    where: { id: eventId },
    data: {
      status: "CANCELLED",
      cancelReason: parsed.data.reason,
      cancelledAt: new Date(),
    },
  });

  void notifyEventCancelled({
    req,
    eventId: event.id,
    reason: parsed.data.reason,
  }).catch(() => {
    // fire-and-forget
  });

  return NextResponse.json(event);
});
