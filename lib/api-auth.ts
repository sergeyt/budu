import { auth } from "@/lib/auth";
import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/model";
import { errors } from "@/lib/error";

export async function requireUser(params: { isSuperAdmin?: boolean } = {}) {
  const { isSuperAdmin } = params;
  const session = await auth();
  const user = session?.user;
  if (!user) {
    throw errors.unauthorized();
  }
  if (isSuperAdmin && user.role !== UserRole.SUPERADMIN) {
    throw errors.superAdminRequired();
  }
  return { session, userId: user.id };
}

export async function isSuperAdmin(userId: string) {
  const u = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  return u?.role === "SUPERADMIN";
}

export async function isPlaceAdmin(userId: string, placeId: string) {
  const admin = await prisma.placeAdmin.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });
  return !!admin;
}
