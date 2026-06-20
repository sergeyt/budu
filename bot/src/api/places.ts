import { ApiError, apiFetch } from "./client.ts";
import type { Place } from "./types.ts";

export async function findPlaceById(id: string): Promise<Place | null> {
  try {
    return await apiFetch<Place>(`/api/internal/bot/places/${id}`);
  } catch (err) {
    if (err instanceof ApiError && err.status === 404) {
      return null;
    }
    throw err;
  }
}

export async function linkTelegramChatToPlace(
  placeId: string,
  chatId: number,
  label: string | null,
): Promise<void> {
  await apiFetch(`/api/internal/bot/places/${placeId}/telegram`, {
    method: "POST",
    body: { chatId, label },
  });
}

export async function unlinkTelegramChatFromPlace(
  placeId: string,
  chatId: number,
): Promise<boolean> {
  const out = await apiFetch<{ ok: true; removed: boolean }>(
    `/api/internal/bot/places/${placeId}/telegram`,
    { method: "DELETE", body: { chatId } },
  );
  return out.removed;
}

export async function placesLinkedToChat(chatId: number): Promise<Place[]> {
  return await apiFetch<Place[]>(
    `/api/internal/bot/places/by-chat/${chatId}`,
  );
}
