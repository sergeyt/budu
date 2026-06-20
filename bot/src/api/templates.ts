import { apiFetch } from "./client.ts";
import type { TemplateRow } from "./types.ts";

export type { TemplateRow };

export async function listActiveTemplates(): Promise<TemplateRow[]> {
  return await apiFetch<TemplateRow[]>(
    "/api/internal/bot/templates/active",
  );
}

export async function listTemplatesForChat(
  chatId: number,
): Promise<TemplateRow[]> {
  return await apiFetch<TemplateRow[]>(
    `/api/internal/bot/templates/by-chat/${chatId}`,
  );
}
