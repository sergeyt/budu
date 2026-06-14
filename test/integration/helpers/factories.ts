import { prisma } from "@/lib/prisma";

let userCounter = 0;
let placeCounter = 0;
let eventCounter = 0;

export async function makeUser(
  overrides: { email?: string; name?: string } = {},
) {
  userCounter += 1;
  return prisma.user.create({
    data: {
      email: overrides.email ?? `user-${userCounter}-${Date.now()}@test.local`,
      name: overrides.name ?? `User ${userCounter}`,
    },
  });
}

export async function makeUsers(count: number) {
  return Promise.all(Array.from({ length: count }, () => makeUser()));
}

export async function makePlace(overrides: { name?: string } = {}) {
  placeCounter += 1;
  return prisma.place.create({
    data: {
      name: overrides.name ?? `Place ${placeCounter} ${Date.now()}`,
    },
  });
}

export async function makeEvent(
  overrides: {
    placeId?: string;
    title?: string;
    startAt?: Date;
    capacity?: number | null;
    reserveCapacity?: number | null;
  } = {},
) {
  eventCounter += 1;
  const placeId = overrides.placeId ?? (await makePlace()).id;
  return prisma.event.create({
    data: {
      title: overrides.title ?? `Event ${eventCounter}`,
      // Default: starts in 1 hour so canRegisterNow() returns true.
      startAt: overrides.startAt ?? new Date(Date.now() + 60 * 60 * 1000),
      placeId,
      capacity: overrides.capacity ?? null,
      reserveCapacity: overrides.reserveCapacity ?? null,
    },
  });
}
