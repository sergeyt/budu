import { apiFetch } from "@/api/client.ts";
import type { Place } from "@/api/types.ts";

export type CreateTemplateBody = {
  title: string;
  dayOfWeek: number;
  localTime: string;
  durationMinutes?: number | null;
  capacity?: number | null;
  reserveCapacity?: number | null;
  announceOffsetMinutes?: number;
};

export async function listAdminPlaces(
  telegramUserId: number,
): Promise<Place[]> {
  return apiFetch<Place[]>(
    `/api/internal/bot/users/${telegramUserId}/admin-places`,
  );
}

export async function createTemplateForAdmin(
  placeId: string,
  telegramUserId: number,
  body: CreateTemplateBody,
): Promise<{ id: string; title: string }> {
  return apiFetch(`/api/internal/bot/places/${placeId}/templates`, {
    method: "POST",
    body: { telegramUserId, ...body },
  });
}
