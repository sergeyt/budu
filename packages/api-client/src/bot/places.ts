import { ApiError, type ApiClient } from "../client.ts";
import type { BotPlace } from "../types/bot.ts";

const PREFIX = "/api/internal/bot";

export function createBotPlacesApi(client: ApiClient) {
  return {
    async findById(id: string): Promise<BotPlace | null> {
      try {
        return await client.fetch<BotPlace>(`${PREFIX}/places/${id}`);
      } catch (err) {
        if (err instanceof ApiError && err.status === 404) {
          return null;
        }
        throw err;
      }
    },

    linkTelegram(placeId: string, chatId: number, label: string | null) {
      return client.fetch<void>(`${PREFIX}/places/${placeId}/telegram`, {
        method: "POST",
        body: { chatId, label },
      });
    },

    async unlinkTelegram(placeId: string, chatId: number): Promise<boolean> {
      const out = await client.fetch<{ ok: true; removed: boolean }>(
        `${PREFIX}/places/${placeId}/telegram`,
        { method: "DELETE", body: { chatId } },
      );
      return out.removed;
    },

    listByChat(chatId: number) {
      return client.fetch<BotPlace[]>(`${PREFIX}/places/by-chat/${chatId}`);
    },
  };
}

export type BotPlacesApi = ReturnType<typeof createBotPlacesApi>;
