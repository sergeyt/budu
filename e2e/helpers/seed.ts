import { hashPassword } from "@/lib/password";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/model";
import {
  makeEvent,
  makePlace,
  makePlaceAdmin,
  makeUser,
} from "../../test/helpers/factories";

export const E2E_PLAYER = {
  username: "testuser",
  password: "testuser",
} as const;
export const E2E_ADMIN = {
  username: "testadmin",
  password: "testadmin",
} as const;
export const E2E_SUPERADMIN = {
  username: "testsuperadmin",
  password: "testsuperadmin",
} as const;

export type SeedOptions = {
  capacity?: number | null;
  reserveCapacity?: number | null;
  /** Extra confirmed registration so the next player hits the waitlist. */
  fillConfirmed?: boolean;
};

export async function seedE2e(opts: SeedOptions = {}) {
  const place = await makePlace({ name: "E2E Club" });
  const event = await makeEvent({
    placeId: place.id,
    title: "E2E Session",
    capacity: opts.capacity ?? 10,
    reserveCapacity: opts.reserveCapacity ?? 5,
  });

  const [userHash, adminHash, superHash] = await Promise.all([
    hashPassword(E2E_PLAYER.password),
    hashPassword(E2E_ADMIN.password),
    hashPassword(E2E_SUPERADMIN.password),
  ]);

  const [testuser, testadmin, testsuperadmin] = await Promise.all([
    makeUser({
      username: E2E_PLAYER.username,
      name: "Test User",
      passwordHash: userHash,
    }),
    makeUser({
      username: E2E_ADMIN.username,
      name: "Test Admin",
      passwordHash: adminHash,
    }),
    makeUser({
      username: E2E_SUPERADMIN.username,
      name: "Test Super Admin",
      passwordHash: superHash,
      role: UserRole.SUPERADMIN,
    }),
  ]);
  await makePlaceAdmin(testadmin.id, place.id);

  if (opts.fillConfirmed) {
    const dummy = await makeUser({ name: "Dummy Confirmed" });
    await prisma.registration.create({
      data: {
        userId: dummy.id,
        eventId: event.id,
        status: "CONFIRMED",
      },
    });
  }

  return { place, event, testuser, testadmin, testsuperadmin };
}
