import { apiFetch } from "./client.ts";
import type {
  AnnouncementRef,
  CancelOutcome,
  RegisterOutcome,
} from "./types.ts";

export type { RegisterOutcome, CancelOutcome, AnnouncementRef };

export async function getAnnouncements(
  eventId: string,
): Promise<AnnouncementRef[]> {
  return await apiFetch<AnnouncementRef[]>(
    `/api/internal/bot/events/${eventId}/announcements`,
  );
}

export async function upsertAnnouncement(
  eventId: string,
  ref: AnnouncementRef,
): Promise<void> {
  await apiFetch(`/api/internal/bot/events/${eventId}/announcements`, {
    method: "PUT",
    body: ref,
  });
}

export async function registerUserForEvent(
  eventId: string,
  userId: string,
): Promise<RegisterOutcome> {
  return await apiFetch<RegisterOutcome>(
    `/api/internal/bot/events/${eventId}/register`,
    { method: "POST", body: { userId } },
  );
}

export async function cancelRegistration(
  eventId: string,
  userId: string,
): Promise<CancelOutcome> {
  return await apiFetch<CancelOutcome>(
    `/api/internal/bot/events/${eventId}/register`,
    { method: "DELETE", body: { userId } },
  );
}
