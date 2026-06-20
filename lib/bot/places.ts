import { prisma } from "@/lib/prisma";
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

export async function findPlaceById(id: string): Promise<PlaceDto | null> {
  const place = await prisma.place.findUnique({ where: { id } });
  return place ? toPlaceDto(place) : null;
}

export async function linkTelegramChatToPlace(input: {
  placeId: string;
  chatId: number;
  label: string | null;
}): Promise<void> {
  const target = String(input.chatId);
  await prisma.placeNotificationChannel.upsert({
    where: {
      placeId_type_target: {
        placeId: input.placeId,
        type: "TELEGRAM",
        target,
      },
    },
    create: {
      placeId: input.placeId,
      type: "TELEGRAM",
      target,
      label: input.label,
    },
    update: { label: input.label },
  });
}

export async function unlinkTelegramChatFromPlace(input: {
  placeId: string;
  chatId: number;
}): Promise<boolean> {
  const target = String(input.chatId);
  const deleted = await prisma.placeNotificationChannel.deleteMany({
    where: {
      placeId: input.placeId,
      type: "TELEGRAM",
      target,
    },
  });
  return deleted.count > 0;
}

export async function placesLinkedToChat(chatId: number): Promise<PlaceDto[]> {
  const target = String(chatId);
  const rows = await prisma.place.findMany({
    where: {
      channels: {
        some: { type: "TELEGRAM", target },
      },
    },
    orderBy: { name: "asc" },
  });
  return rows.map(toPlaceDto);
}
