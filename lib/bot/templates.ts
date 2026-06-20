import { prisma } from "@/lib/prisma";
import { dateToLocalTime, localTimeToDate } from "@/lib/templates";
import { isTelegramUserPlaceAdmin } from "@/lib/bot/admin";
import type { TemplateDto } from "@/lib/bot/types";

export function toTemplateDto(row: {
  id: string;
  placeId: string;
  title: string;
  description: string | null;
  infoUrl: string | null;
  dayOfWeek: number;
  localTime: Date;
  durationMinutes: number | null;
  capacity: number | null;
  reserveCapacity: number | null;
  announceOffsetMinutes: number;
  enabled: boolean;
  place: { name: string; timezone: string };
}): TemplateDto {
  return {
    id: row.id,
    placeId: row.placeId,
    placeName: row.place.name,
    placeTimezone: row.place.timezone,
    title: row.title,
    description: row.description,
    infoUrl: row.infoUrl,
    dayOfWeek: row.dayOfWeek,
    localTime: `${dateToLocalTime(row.localTime)}:00`,
    durationMinutes: row.durationMinutes,
    capacity: row.capacity,
    reserveCapacity: row.reserveCapacity,
    announceOffsetMinutes: row.announceOffsetMinutes,
    enabled: row.enabled,
  };
}

const templateInclude = {
  place: { select: { name: true, timezone: true } },
} as const;

export async function listActiveTemplates(): Promise<TemplateDto[]> {
  const rows = await prisma.eventTemplate.findMany({
    where: { enabled: true },
    include: templateInclude,
    orderBy: [{ place: { name: "asc" } }, { title: "asc" }],
  });
  return rows.map(toTemplateDto);
}

export async function listTemplatesForChat(
  chatId: number,
): Promise<TemplateDto[]> {
  const target = String(chatId);
  const rows = await prisma.eventTemplate.findMany({
    where: {
      place: {
        channels: {
          some: { type: "TELEGRAM", target },
        },
      },
    },
    include: templateInclude,
    orderBy: [{ place: { name: "asc" } }, { title: "asc" }],
  });
  return rows.map(toTemplateDto);
}

export async function createTemplateForTelegramAdmin(input: {
  telegramUserId: number;
  placeId: string;
  body: {
    title: string;
    description?: string | null;
    infoUrl?: string | null;
    dayOfWeek: number;
    localTime: string;
    durationMinutes?: number | null;
    capacity?: number | null;
    reserveCapacity?: number | null;
    announceOffsetMinutes?: number;
    enabled?: boolean;
  };
}): Promise<TemplateDto | null> {
  const allowed = await isTelegramUserPlaceAdmin(
    input.telegramUserId,
    input.placeId,
  );
  if (!allowed) {
    return null;
  }
  const place = await prisma.place.findUnique({ where: { id: input.placeId } });
  if (!place) {
    return null;
  }
  const data = input.body;
  const row = await prisma.eventTemplate.create({
    data: {
      placeId: input.placeId,
      title: data.title,
      description: data.description ?? null,
      infoUrl: data.infoUrl ?? null,
      dayOfWeek: data.dayOfWeek,
      localTime: localTimeToDate(data.localTime),
      durationMinutes: data.durationMinutes ?? null,
      capacity: data.capacity ?? null,
      reserveCapacity: data.reserveCapacity ?? null,
      announceOffsetMinutes: data.announceOffsetMinutes ?? 1440,
      enabled: data.enabled ?? true,
    },
    include: templateInclude,
  });
  return toTemplateDto(row);
}
