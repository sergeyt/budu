import { sql } from "./client.ts";
import {
  type CapacityState,
  decideRegistrationStatus,
  shouldPromoteFromWaitlist,
} from "@/services/capacity.ts";
import { canRegisterNow } from "@/services/registrationWindow.ts";

export type RegisterOutcome =
  | { ok: true; status: "CONFIRMED" | "RESERVED"; alreadyRegistered: false }
  | { ok: true; status: "CONFIRMED" | "RESERVED"; alreadyRegistered: true }
  | {
    ok: false;
    reason: "FULL" | "EVENT_NOT_FOUND" | "WINDOW_CLOSED";
  };

/**
 * Register `userId` for `eventId` under a Postgres advisory transaction lock
 * scoped by event id. Mirrors lib/locks.ts + the FSM in
 * app/api/events/[id]/register/route.ts.
 *
 * The lock guarantees `count → decide → insert` is atomic against the
 * event's capacity, so concurrent taps can't both land in CONFIRMED past
 * the cap.
 */
export async function registerUserForEvent(
  eventId: string,
  userId: string,
): Promise<RegisterOutcome> {
  return await sql.begin(async (tx) => {
    await tx`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`event:register:${eventId}`}, 0)
      )
    `;

    const existing = await tx<{ status: "CONFIRMED" | "RESERVED" }[]>`
      SELECT status FROM "Registration"
      WHERE "userId" = ${userId} AND "eventId" = ${eventId}
      LIMIT 1
    `;
    if (existing.length > 0) {
      return {
        ok: true,
        status: existing[0].status,
        alreadyRegistered: true,
      } as const;
    }

    const evRows = await tx<
      {
        capacity: number | null;
        reserveCapacity: number | null;
        startAt: Date;
      }[]
    >`
      SELECT capacity, "reserveCapacity", "startAt"
      FROM "Event"
      WHERE id = ${eventId}
      LIMIT 1
    `;
    if (evRows.length === 0) {
      return { ok: false, reason: "EVENT_NOT_FOUND" } as const;
    }
    const ev = evRows[0];
    if (!canRegisterNow(ev.startAt)) {
      return { ok: false, reason: "WINDOW_CLOSED" } as const;
    }

    const [{ count: confirmedCount }] = await tx<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "Registration"
      WHERE "eventId" = ${eventId} AND status = 'CONFIRMED'
    `;
    const [{ count: reserveCount }] = await tx<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "Registration"
      WHERE "eventId" = ${eventId} AND status = 'RESERVED'
    `;

    const state: CapacityState = {
      confirmedCount,
      reserveCount,
      confirmedCap: ev.capacity,
      reserveCap: ev.reserveCapacity,
    };
    const status = decideRegistrationStatus(state);
    if (status === "FULL") {
      return { ok: false, reason: "FULL" } as const;
    }

    await tx`
      INSERT INTO "Registration"
        (id, "userId", "eventId", status, "createdAt")
      VALUES
        ('reg_' || replace(gen_random_uuid()::text, '-', ''),
         ${userId}, ${eventId}, ${status}, NOW())
    `;
    return { ok: true, status, alreadyRegistered: false } as const;
  });
}

export type CancelOutcome = {
  unregistered: boolean;
  promotedUserId: string | null;
};

/**
 * Cancel a user's registration. If they were CONFIRMED and the cap has room
 * afterwards, promote the oldest RESERVED registrant to CONFIRMED.
 */
export async function cancelRegistration(
  eventId: string,
  userId: string,
): Promise<CancelOutcome> {
  return await sql.begin(async (tx) => {
    await tx`
      SELECT pg_advisory_xact_lock(
        hashtextextended(${`event:register:${eventId}`}, 0)
      )
    `;

    const deleted = await tx<{ id: string }[]>`
      DELETE FROM "Registration"
      WHERE "userId" = ${userId} AND "eventId" = ${eventId}
      RETURNING id
    `;
    if (deleted.length === 0) {
      return { unregistered: false, promotedUserId: null };
    }

    const evRows = await tx<{ capacity: number | null }[]>`
      SELECT capacity FROM "Event" WHERE id = ${eventId} LIMIT 1
    `;
    if (evRows.length === 0) {
      return { unregistered: true, promotedUserId: null };
    }
    const [{ count: confirmedCount }] = await tx<{ count: number }[]>`
      SELECT COUNT(*)::int AS count FROM "Registration"
      WHERE "eventId" = ${eventId} AND status = 'CONFIRMED'
    `;
    if (
      !shouldPromoteFromWaitlist({
        confirmedCount,
        confirmedCap: evRows[0].capacity,
      })
    ) {
      return { unregistered: true, promotedUserId: null };
    }
    const next = await tx<{ id: string; userId: string }[]>`
      SELECT id, "userId" FROM "Registration"
      WHERE "eventId" = ${eventId} AND status = 'RESERVED'
      ORDER BY "createdAt" ASC
      LIMIT 1
    `;
    if (next.length === 0) {
      return { unregistered: true, promotedUserId: null };
    }
    await tx`
      UPDATE "Registration"
      SET status = 'CONFIRMED'
      WHERE id = ${next[0].id}
    `;
    return { unregistered: true, promotedUserId: next[0].userId };
  });
}
