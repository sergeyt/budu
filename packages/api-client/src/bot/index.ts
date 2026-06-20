import type { ApiClient } from "../client.ts";
import { createBotEventsApi } from "./events.ts";
import { createBotPlacesApi } from "./places.ts";
import {
  createBotAdminApi,
  createBotAnnouncementsApi,
  createBotChannelsApi,
  createBotMaterializeApi,
  createBotTemplatesApi,
  createBotUsersApi,
} from "./rest.ts";

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

export { createBotPlacesApi } from "./places.ts";
export { createBotEventsApi } from "./events.ts";
export {
  createBotAdminApi,
  createBotAnnouncementsApi,
  createBotChannelsApi,
  createBotMaterializeApi,
  createBotTemplatesApi,
  createBotUsersApi,
} from "./rest.ts";

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
} from "../types/bot.ts";

export {
  parseAnnounceable,
  parseEvent,
  parseParticipant,
} from "../types/bot.ts";
