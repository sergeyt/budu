import { NextResponse } from "next/server";
import { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { requireUser } from "@/lib/api-auth";
import { canRegisterNow } from "@/lib/util";
import { notifyEventChange } from "@/lib/notifications/notify";
import {
  BadRequestError,
  ConflictError,
  NotFoundError,
  errorMiddleware,
} from "@/lib/error";
import { log } from "@/lib/log";

type Params = { id?: string };

type RegisterStatus = "CONFIRMED" | "RESERVED";

// Acquire a transaction-scoped advisory lock keyed by event id so that
// concurrent register/unregister calls for the same event are serialized.
// The lock is released automatically when the transaction commits or aborts.
async function lockEvent(tx: Prisma.TransactionClient, eventId: string) {
  await tx.$executeRaw`SELECT pg_advisory_xact_lock(hashtextextended(${eventId}, 0))`;
}

export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw new BadRequestError("eventId is required");
  }
  const { userId } = await requireUser();

  let outcome: RegisterStatus | null = null;
  let actor: string | null = null;

  try {
    await prisma.$transaction(async (tx) => {
      await lockEvent(tx, eventId);

      const event = await tx.event.findUnique({ where: { id: eventId } });
      if (!event) {
        throw new NotFoundError("Event not found");
      }
      if (!canRegisterNow(event.startAt)) {
        throw new BadRequestError(
          "Registration opens 24h before start and closes at start.",
        );
      }

      const sessionUser = await tx.user.findUnique({ where: { id: userId } });
      actor = sessionUser?.name ?? sessionUser?.email ?? null;

      const [confirmedCount, reserveCount] = await Promise.all([
        tx.registration.count({ where: { eventId, status: "CONFIRMED" } }),
        tx.registration.count({ where: { eventId, status: "RESERVED" } }),
      ]);
      const confirmedCap = event.capacity ?? Number.POSITIVE_INFINITY;
      const reserveCap = event.reserveCapacity ?? Number.POSITIVE_INFINITY;

      let status: RegisterStatus = "CONFIRMED";
      if (confirmedCount >= confirmedCap) {
        if (reserveCount >= reserveCap) {
          throw new ConflictError("Event and reserve list are full");
        }
        status = "RESERVED";
      }
      outcome = status;

      await tx.registration.create({ data: { userId, eventId, status } });
    });
  } catch (err) {
    if (
      err instanceof Prisma.PrismaClientKnownRequestError &&
      err.code === "P2002"
    ) {
      throw new ConflictError("Already registered for this event");
    }
    throw err;
  }

  // Fire-and-forget so a slow or failing notification channel never blocks
  // (or fails) the user-visible registration response.
  void notifyEventChange({
    req,
    eventId,
    type: outcome === "CONFIRMED" ? "REGISTERED" : "WAITLISTED",
    actor,
  }).catch((err) => {
    log.error("notifyEventChange failed", err, { eventId, type: "register" });
  });

  return NextResponse.json({ ok: true, status: outcome }, { status: 201 });
});

export const DELETE = errorMiddleware<Params>(async (req, ctx) => {
  const { id: eventId } = await ctx.params;
  if (!eventId) {
    throw new BadRequestError("eventId is required");
  }
  const { userId } = await requireUser();

  let actor: string | null = null;
  let promotedName: string | null = null;
  let wasPromoted = false;
  let didUnregister = false;

  await prisma.$transaction(async (tx) => {
    await lockEvent(tx, eventId);

    const me = await tx.user.findUnique({ where: { id: userId } });
    actor = me?.name ?? me?.email ?? null;

    const deleted = await tx.registration
      .delete({ where: { userId_eventId: { userId, eventId } } })
      .catch((err) => {
        if (
          err instanceof Prisma.PrismaClientKnownRequestError &&
          err.code === "P2025"
        ) {
          return null;
        }
        throw err;
      });
    didUnregister = !!deleted;

    const event = await tx.event.findUnique({ where: { id: eventId } });
    if (!event || !didUnregister) {
      return;
    }

    const confirmedCap = event.capacity ?? Number.POSITIVE_INFINITY;
    const confirmedCount = await tx.registration.count({
      where: { eventId, status: "CONFIRMED" },
    });
    if (confirmedCount >= confirmedCap) {
      return;
    }
    const nextWait = await tx.registration.findFirst({
      where: { eventId, status: "RESERVED" },
      orderBy: { createdAt: "asc" },
    });
    if (!nextWait) {
      return;
    }
    const promoted = await tx.user.findUnique({
      where: { id: nextWait.userId },
    });
    promotedName = promoted?.name ?? promoted?.email ?? null;
    await tx.registration.update({
      where: { id: nextWait.id },
      data: { status: "CONFIRMED" },
    });
    wasPromoted = true;
  });

  if (didUnregister) {
    void (async () => {
      try {
        await notifyEventChange({
          req,
          eventId,
          type: "UNREGISTERED",
          actor,
        });
        if (wasPromoted) {
          await notifyEventChange({
            req,
            eventId,
            type: "PROMOTED",
            actor: promotedName,
          });
        }
      } catch (err) {
        log.error("notifyEventChange failed", err, {
          eventId,
          type: "unregister",
        });
      }
    })();
  }

  return { ok: true, unregistered: didUnregister, promoted: wasPromoted };
});
