import type { ApiClient } from "../client.ts";
import type {
  AddPlaceAdminBody,
  CreateEventBody,
  CreateEventTemplateBody,
  CreatePlaceBody,
  RegisterResponse,
  SuperAdminAction,
  TemplateChannel,
  UnregisterResponse,
  UpdateEventTemplateBody,
  UpdatePlaceBody,
  UpsertTemplateChannelBody,
  WebEvent,
  WebEventTemplate,
  WebPlace,
  WebRegistration,
} from "../types/web.ts";

export function createWebPlacesApi(client: ApiClient) {
  return {
    list: () => client.fetch<WebPlace[]>("/api/places"),
    get: (id: string) => client.fetch<WebPlace>(`/api/places/${id}`),
    create: (body: CreatePlaceBody) =>
      client.fetch<WebPlace>("/api/places", { method: "POST", body }),
    update: (id: string, body: UpdatePlaceBody) =>
      client.fetch<WebPlace>(`/api/places/${id}`, { method: "PATCH", body }),
    addAdmin: (placeId: string, body: AddPlaceAdminBody) =>
      client.fetch<{ id: string; userId: string; placeId: string }>(
        `/api/places/${placeId}/admins`,
        { method: "POST", body },
      ),
    events: (placeId: string) =>
      client.fetch<WebEvent[]>(`/api/places/${placeId}/events`),
    action: <T = unknown>(placeId: string, body: SuperAdminAction) =>
      client.fetch<T>(`/api/places/${placeId}/action`, {
        method: "POST",
        body,
      }),
  };
}

export function createWebEventsApi(client: ApiClient) {
  return {
    create: (body: CreateEventBody) =>
      client.fetch<WebEvent>("/api/events", { method: "POST", body }),
    participants: (id: string) =>
      client.fetch<WebRegistration[]>(`/api/events/${id}/participants`),
    register: (id: string) =>
      client.fetch<RegisterResponse>(`/api/events/${id}/register`, {
        method: "POST",
      }),
    unregister: (id: string) =>
      client.fetch<UnregisterResponse>(`/api/events/${id}/register`, {
        method: "DELETE",
      }),
  };
}

export function createWebTemplatesApi(client: ApiClient) {
  return {
    list: (placeId: string) =>
      client.fetch<WebEventTemplate[]>(`/api/places/${placeId}/templates`),
    create: (placeId: string, body: CreateEventTemplateBody) =>
      client.fetch<WebEventTemplate>(`/api/places/${placeId}/templates`, {
        method: "POST",
        body,
      }),
    update: (id: string, body: UpdateEventTemplateBody) =>
      client.fetch<WebEventTemplate>(`/api/templates/${id}`, {
        method: "PATCH",
        body,
      }),
    remove: (id: string) =>
      client.fetch<{ ok: true; deleted: string }>(`/api/templates/${id}`, {
        method: "DELETE",
      }),
    channels: {
      list: (templateId: string) =>
        client.fetch<TemplateChannel[]>(
          `/api/templates/${templateId}/channels`,
        ),
      upsert: (templateId: string, body: UpsertTemplateChannelBody) =>
        client.fetch<TemplateChannel>(
          `/api/templates/${templateId}/channels`,
          { method: "POST", body },
        ),
      remove: (templateId: string, channelId: string) =>
        client.fetch<{ ok: true; deleted: string }>(
          `/api/templates/${templateId}/channels?channelId=${
            encodeURIComponent(channelId)
          }`,
          { method: "DELETE" },
        ),
    },
  };
}

export function createWebApi(client: ApiClient) {
  return {
    places: createWebPlacesApi(client),
    events: createWebEventsApi(client),
    templates: createWebTemplatesApi(client),
  };
}

export type WebApi = ReturnType<typeof createWebApi>;

export type {
  AddPlaceAdminBody,
  CreateEventBody,
  CreateEventTemplateBody,
  CreatePlaceBody,
  RegisterResponse,
  SuperAdminAction,
  TelegramLinkResponse,
  TemplateChannel,
  UnregisterResponse,
  UpdateEventTemplateBody,
  UpdatePlaceBody,
  UpsertTemplateChannelBody,
  WebEvent,
  WebEventTemplate,
  WebPlace,
  WebRegistration,
} from "../types/web.ts";
