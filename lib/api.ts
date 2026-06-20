import type { z } from "zod";
import type {
  AddPlaceAdmin,
  CreateEvent,
  CreateEventTemplate,
  CreatePlace,
  UpdateEventTemplate,
  UpdatePlace,
} from "@/lib/validation";
import type {
  EventTemplate,
  Place,
  Registration,
  RegistrationStatus,
  WorldEvent,
} from "@/types/model";
import { isDefined } from "@/lib/util";

export type CreateEventBody = z.infer<typeof CreateEvent>;
export type CreatePlaceBody = z.infer<typeof CreatePlace>;
export type UpdatePlaceBody = z.infer<typeof UpdatePlace>;
export type AddPlaceAdminBody = z.infer<typeof AddPlaceAdmin>;
export type CreateEventTemplateBody = z.infer<typeof CreateEventTemplate>;
export type UpdateEventTemplateBody = z.infer<typeof UpdateEventTemplate>;

export type RegisterResponse = {
  ok: true;
  status: RegistrationStatus;
  regs: Registration[];
};

export type UnregisterResponse = {
  ok: true;
  unregistered: boolean;
  promoted: boolean;
  regs: Registration[];
};

export type SuperAdminAction =
  | { type: "reuse_event" }
  | { type: "telegram_link" };

export type TelegramLinkResponse = {
  code: string;
  instructions: string;
};

type HttpInit = Omit<RequestInit, "body"> & { body?: unknown };

async function http<T = unknown>(
  input: RequestInfo,
  init?: HttpInit,
): Promise<T> {
  const { body, headers, ...rest } = init ?? {};
  const res = await fetch(input, {
    ...rest,
    headers: { "content-type": "application/json", ...(headers ?? {}) },
    ...(isDefined(body) && { body: JSON.stringify(body) }),
  });
  if (!res.ok) {
    let message = res.statusText;
    try {
      const errBody = (await res.json()) as { error?: string };
      if (errBody?.error) {
        message = errBody.error;
      }
    } catch {
      // response was not JSON; fall back to statusText
    }
    throw new Error(message);
  }
  return (await res.json()) as T;
}

export const api = {
  places: {
    list: () => http<Place[]>("/api/places"),
    get: (id: string) => http<Place>(`/api/places/${id}`),
    create: (body: CreatePlaceBody) =>
      http<Place>("/api/places", { method: "POST", body }),
    update: (id: string, body: UpdatePlaceBody) =>
      http<Place>(`/api/places/${id}`, { method: "PATCH", body }),
    addAdmin: (placeId: string, userEmail: string) =>
      http<{ id: string; userId: string; placeId: string }>(
        `/api/places/${placeId}/admins`,
        {
          method: "POST",
          body: { userEmail } satisfies AddPlaceAdminBody,
        },
      ),
    events: (placeId: string) =>
      http<WorldEvent[]>(`/api/places/${placeId}/events`),
    action: <T = unknown>(placeId: string, body: SuperAdminAction) =>
      http<T>(`/api/places/${placeId}/action`, {
        method: "POST",
        body,
      }),
  },
  events: {
    create: (body: CreateEventBody) =>
      http<WorldEvent>("/api/events", { method: "POST", body }),
    participants: (id: string) =>
      http<Registration[]>(`/api/events/${id}/participants`),
    register: (id: string) =>
      http<RegisterResponse>(`/api/events/${id}/register`, { method: "POST" }),
    unregister: (id: string) =>
      http<UnregisterResponse>(`/api/events/${id}/register`, {
        method: "DELETE",
      }),
  },
  templates: {
    list: (placeId: string) =>
      http<EventTemplate[]>(`/api/places/${placeId}/templates`),
    create: (placeId: string, body: CreateEventTemplateBody) =>
      http<EventTemplate>(`/api/places/${placeId}/templates`, {
        method: "POST",
        body,
      }),
    update: (id: string, body: UpdateEventTemplateBody) =>
      http<EventTemplate>(`/api/templates/${id}`, { method: "PATCH", body }),
    remove: (id: string) =>
      http<{ ok: true; deleted: string }>(`/api/templates/${id}`, {
        method: "DELETE",
      }),
    channels: {
      list: (templateId: string) =>
        http<TemplateChannel[]>(`/api/templates/${templateId}/channels`),
      upsert: (
        templateId: string,
        body: { type: string; target: string; label?: string | null },
      ) =>
        http<TemplateChannel>(`/api/templates/${templateId}/channels`, {
          method: "POST",
          body,
        }),
      remove: (templateId: string, channelId: string) =>
        http<{ ok: true; deleted: string }>(
          `/api/templates/${templateId}/channels?channelId=${encodeURIComponent(channelId)}`,
          { method: "DELETE" },
        ),
    },
  },
};

export type TemplateChannel = {
  id: string;
  templateId: string;
  type: string;
  target: string;
  label: string | null;
};
