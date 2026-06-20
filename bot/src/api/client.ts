import { ApiClient, ApiError } from "@budu/api-client";
import { createBotApi, type BotApi } from "@budu/api-client/bot";
import { loadConfig } from "@/config.ts";

export { ApiError };
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
} from "@budu/api-client/bot";

let cachedClient: ApiClient | undefined;
let cachedApi: BotApi | undefined;

export function getApiClient(): ApiClient {
  if (!cachedClient) {
    const cfg = loadConfig();
    cachedClient = new ApiClient({
      baseUrl: cfg.API_BASE_URL,
      auth: { kind: "bearer", token: cfg.BOT_INTERNAL_TOKEN },
    });
  }
  return cachedClient;
}

export function getBotApi(): BotApi {
  if (!cachedApi) {
    cachedApi = createBotApi(getApiClient());
  }
  return cachedApi;
}

/** Lazy singleton — use `api.places.findById`, `api.events.register`, etc. */
export const api = getBotApi();
