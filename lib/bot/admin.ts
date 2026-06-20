import { prisma } from "@/lib/prisma";
import { UserRole } from "@/types/model";
import type { PlaceDto } from "@/lib/bot/types";

function toPlaceDto(p: {
  id: string;
  name: string;
  description: string | null;
  location: string | null;
  infoUrl: string | null;
}): PlaceDto {
  return {
    id: p.id,
    name: p.name,
    description: p.description,
    location: p.location,
    infoUrl: p.infoUrl,
  };
}

async function userIdForTelegram(telegramUserId: number): Promise<string | null> {
  const row = await prisma.user.findUnique({
    where: { telegramUserId: BigInt(telegramUserId) },
    select: { id: true },
  });
  return row?.id ?? null;
}

export async function isTelegramUserPlaceAdmin(
  telegramUserId: number,
  placeId: string,
): Promise<boolean> {
  const userId = await userIdForTelegram(telegramUserId);
  if (!userId) {
    return false;
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === UserRole.SUPERADMIN) {
    return true;
  }
  const admin = await prisma.placeAdmin.findUnique({
    where: { userId_placeId: { userId, placeId } },
  });
  return !!admin;
}

/** Places a linked Telegram user can manage (place admin or super-admin). */
export async function listAdminPlacesForTelegramUser(
  telegramUserId: number,
): Promise<PlaceDto[]> {
  const userId = await userIdForTelegram(telegramUserId);
  if (!userId) {
    return [];
  }
  const user = await prisma.user.findUnique({
    where: { id: userId },
    select: { role: true },
  });
  if (user?.role === UserRole.SUPERADMIN) {
    const rows = await prisma.place.findMany({ orderBy: { name: "asc" } });
    return rows.map(toPlaceDto);
  }
  const rows = await prisma.place.findMany({
    where: { admins: { some: { userId } } },
    orderBy: { name: "asc" },
  });
  return rows.map(toPlaceDto);
}
