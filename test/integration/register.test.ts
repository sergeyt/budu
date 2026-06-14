import { NextRequest } from "next/server";
import { describe, expect, it, vi } from "vitest";

// Mocks must be declared before any import that pulls the route handler. The
// factory itself imports the helper modules lazily so the userALS instance is
// shared between the mock and the test code.
vi.mock("@/lib/api-auth", async () => {
  const { userALS } = await import("./helpers/auth");
  const { errors } = await import("@/lib/error");
  return {
    requireUser: async () => {
      const store = userALS.getStore();
      if (!store) {
        throw errors.unauthorized();
      }
      return { session: null, userId: store.userId };
    },
    isSuperAdmin: async () => false,
    isPlaceAdmin: async () => false,
  };
});

vi.mock("@/lib/notifications/notify", () => ({
  notifyEventChange: async () => {},
}));

import {
  DELETE as registerDELETE,
  POST as registerPOST,
} from "@/app/api/events/[id]/register/route";
import { withUser } from "./helpers/auth";
import { prisma } from "./helpers/db";
import { makeEvent, makeUser, makeUsers } from "./helpers/factories";

function postRegister(eventId: string) {
  const req = new NextRequest(
    `http://localhost/api/events/${eventId}/register`,
    { method: "POST" },
  );
  return registerPOST(req, { params: Promise.resolve({ id: eventId }) });
}

function deleteRegister(eventId: string) {
  const req = new NextRequest(
    `http://localhost/api/events/${eventId}/register`,
    { method: "DELETE" },
  );
  return registerDELETE(req, { params: Promise.resolve({ id: eventId }) });
}

describe("POST /api/events/[id]/register", () => {
  it("confirms a registration when capacity is available", async () => {
    const user = await makeUser();
    const event = await makeEvent({ capacity: 5 });

    const res = await withUser(user.id, () => postRegister(event.id));
    const body = (await res.json()) as { ok: boolean; status: string };

    expect(res.status).toBe(201);
    expect(body.status).toBe("CONFIRMED");

    const stored = await prisma.registration.findFirst({
      where: { eventId: event.id, userId: user.id },
    });
    expect(stored?.status).toBe("CONFIRMED");
  });

  it("waitlists when confirmed cap is full and reserve has room", async () => {
    const event = await makeEvent({ capacity: 1, reserveCapacity: 5 });
    const [u1, u2] = await makeUsers(2);

    const r1 = await withUser(u1.id, () => postRegister(event.id));
    const r2 = await withUser(u2.id, () => postRegister(event.id));

    expect((await r1.json()).status).toBe("CONFIRMED");
    expect((await r2.json()).status).toBe("RESERVED");
  });

  it("returns 409 when event and reserve list are both full", async () => {
    const event = await makeEvent({ capacity: 1, reserveCapacity: 0 });
    const [u1, u2] = await makeUsers(2);

    await withUser(u1.id, () => postRegister(event.id));
    const res = await withUser(u2.id, () => postRegister(event.id));

    expect(res.status).toBe(409);
  });

  it("returns 409 on duplicate registration by the same user", async () => {
    const user = await makeUser();
    const event = await makeEvent({ capacity: 5 });

    await withUser(user.id, () => postRegister(event.id));
    const res = await withUser(user.id, () => postRegister(event.id));

    expect(res.status).toBe(409);
  });

  it("never exceeds capacity under 50 concurrent registers (advisory lock)", async () => {
    const CAPACITY = 5;
    const RESERVE = 3;
    const CONCURRENCY = 50;

    const event = await makeEvent({
      capacity: CAPACITY,
      reserveCapacity: RESERVE,
    });
    const users = await makeUsers(CONCURRENCY);

    const results = await Promise.allSettled(
      users.map((u) => withUser(u.id, () => postRegister(event.id))),
    );

    expect(results.every((r) => r.status === "fulfilled")).toBe(true);

    const confirmedCount = await prisma.registration.count({
      where: { eventId: event.id, status: "CONFIRMED" },
    });
    const reservedCount = await prisma.registration.count({
      where: { eventId: event.id, status: "RESERVED" },
    });

    // The advisory lock must enforce these invariants exactly.
    expect(confirmedCount).toBe(CAPACITY);
    expect(reservedCount).toBe(RESERVE);

    // Every other request should have been rejected as "full" (409).
    const statuses = await Promise.all(
      results.map(async (r) => (r.status === "fulfilled" ? r.value.status : 0)),
    );
    const fullCount = statuses.filter((s) => s === 409).length;
    expect(fullCount).toBe(CONCURRENCY - CAPACITY - RESERVE);
  });
});

describe("DELETE /api/events/[id]/register", () => {
  it("removes the registration", async () => {
    const user = await makeUser();
    const event = await makeEvent({ capacity: 5 });

    await withUser(user.id, () => postRegister(event.id));
    const res = await withUser(user.id, () => deleteRegister(event.id));
    const body = (await res.json()) as {
      ok: boolean;
      unregistered: boolean;
      promoted: boolean;
    };

    expect(res.status).toBe(200);
    expect(body.unregistered).toBe(true);
    expect(body.promoted).toBe(false);

    const remaining = await prisma.registration.count({
      where: { eventId: event.id, userId: user.id },
    });
    expect(remaining).toBe(0);
  });

  it("promotes the next waitlisted user when a confirmed slot frees up", async () => {
    const event = await makeEvent({ capacity: 1, reserveCapacity: 5 });
    const [u1, u2] = await makeUsers(2);

    await withUser(u1.id, () => postRegister(event.id));
    await withUser(u2.id, () => postRegister(event.id));

    const res = await withUser(u1.id, () => deleteRegister(event.id));
    const body = (await res.json()) as {
      unregistered: boolean;
      promoted: boolean;
    };

    expect(body.unregistered).toBe(true);
    expect(body.promoted).toBe(true);

    const promoted = await prisma.registration.findFirst({
      where: { eventId: event.id, userId: u2.id },
    });
    expect(promoted?.status).toBe("CONFIRMED");
  });

  it("is a no-op when the user has no registration", async () => {
    const user = await makeUser();
    const event = await makeEvent({ capacity: 5 });

    const res = await withUser(user.id, () => deleteRegister(event.id));
    const body = (await res.json()) as {
      unregistered: boolean;
      promoted: boolean;
    };

    expect(res.status).toBe(200);
    expect(body.unregistered).toBe(false);
    expect(body.promoted).toBe(false);
  });
});

describe("auto-update timestamps", () => {
  it("bumps Event.updatedAt on update", async () => {
    const event = await makeEvent({ capacity: 5 });
    const before = event.updatedAt.getTime();

    // Postgres timestamp has microsecond resolution; sleep a couple ms so the
    // updated value is observably different even on very fast machines.
    await new Promise((r) => setTimeout(r, 5));

    const updated = await prisma.event.update({
      where: { id: event.id },
      data: { title: "Updated" },
    });
    expect(updated.updatedAt.getTime()).toBeGreaterThan(before);
  });
});
