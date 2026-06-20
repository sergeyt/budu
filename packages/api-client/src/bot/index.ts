import type { ApiClient } from "../client";
import { createBotEventsApi } from "./events";
import { createBotPlacesApi } from "./places";
import {
  createBotAdminApi,
  createBotAnnouncementsApi,
  createBotChannelsApi,
  createBotMaterializeApi,
  createBotTemplatesApi,
  createBotUsersApi,
} from "./rest";

/** Typed client for `/api/internal/bot/*` (Telegram bot service). */
export function createBotApi(client: ApiClient) {
  return {
    places: createBotPlacesApi(client),
    events: createBotEventsApi(client),
    users: createBotUsersApi(client),
    announcements: createBotAnnouncementsApi(client),
    templates: createBotTemplatesApi(client),
    admin: createBotAdminApi(client),
    materialize: createBotMaterializeApi(client),
    channels: createBotChannelsApi(client),
  };
}

export type BotApi = ReturnType<typeof createBotApi>;

export { createBotPlacesApi } from "./places";
export { createBotEventsApi } from "./events";
export {
  createBotAdminApi,
  createBotAnnouncementsApi,
  createBotChannelsApi,
  createBotMaterializeApi,
  createBotTemplatesApi,
  createBotUsersApi,
} from "./rest";

export type {
  AnnounceableEvent,
  AnnouncementRef,
  BotPlace,
  BotUser,
  CancelOutcome,
  CreateTemplateBody,
  EventRow,
  MaterializeResult,
  ParticipantRow,
  RegisterOutcome,
  TelegramChannel,
  TemplateRow,
} from "../types/bot";

export {
  parseAnnounceable,
  parseEvent,
  parseParticipant,
} from "../types/bot";
