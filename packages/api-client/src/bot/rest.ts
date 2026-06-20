import type { ApiClient } from "../client.ts";
import type {
  AnnouncementRef,
  BotPlace,
  BotUser,
  CancelOutcome,
  CreateTemplateBody,
  MaterializeResult,
  RegisterOutcome,
  TelegramChannel,
  TemplateRow,
} from "../types/bot.ts";

const PREFIX = "/api/internal/bot";

export function createBotUsersApi(client: ApiClient) {
  return {
    findOrCreateTelegram(
      telegramUserId: number,
      attrs: { username?: string; firstName?: string },
    ) {
      return client.fetch<BotUser>(`${PREFIX}/users/telegram`, {
        method: "POST",
        body: {
          telegramUserId,
          username: attrs.username,
          firstName: attrs.firstName,
        },
      });
    },
  };
}

export function createBotAnnouncementsApi(client: ApiClient) {
  return {
    list(eventId: string) {
      return client.fetch<AnnouncementRef[]>(
        `${PREFIX}/events/${eventId}/announcements`,
      );
    },

    upsert(eventId: string, ref: AnnouncementRef) {
      return client.fetch<void>(`${PREFIX}/events/${eventId}/announcements`, {
        method: "PUT",
        body: ref,
      });
    },

    register(eventId: string, userId: string) {
      return client.fetch<RegisterOutcome>(
        `${PREFIX}/events/${eventId}/register`,
        { method: "POST", body: { userId } },
      );
    },

    cancel(eventId: string, userId: string) {
      return client.fetch<CancelOutcome>(
        `${PREFIX}/events/${eventId}/register`,
        { method: "DELETE", body: { userId } },
      );
    },
  };
}

export function createBotTemplatesApi(client: ApiClient) {
  return {
    listActive() {
      return client.fetch<TemplateRow[]>(`${PREFIX}/templates/active`);
    },

    listByChat(chatId: number) {
      return client.fetch<TemplateRow[]>(
        `${PREFIX}/templates/by-chat/${chatId}`,
      );
    },
  };
}

export function createBotAdminApi(client: ApiClient) {
  return {
    listPlaces(telegramUserId: number) {
      return client.fetch<BotPlace[]>(
        `${PREFIX}/users/${telegramUserId}/admin-places`,
      );
    },

    createTemplate(
      placeId: string,
      telegramUserId: number,
      body: CreateTemplateBody,
    ) {
      return client.fetch<{ id: string; title: string }>(
        `${PREFIX}/places/${placeId}/templates`,
        { method: "POST", body: { telegramUserId, ...body } },
      );
    },
  };
}

export function createBotMaterializeApi(client: ApiClient) {
  return {
    upcoming(now: Date = new Date()) {
      return client.fetch<MaterializeResult>(
        `${PREFIX}/cron/materialize`,
        { method: "POST", body: { now: now.toISOString() } },
      );
    },
  };
}

export function createBotChannelsApi(client: ApiClient) {
  return {
    listTelegramForEvent(eventId: string) {
      return client.fetch<TelegramChannel[]>(
        `${PREFIX}/events/${eventId}/telegram-channels`,
      );
    },
  };
}
