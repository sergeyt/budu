import { listActiveTemplates } from "@/lib/bot/templates";
import { botRoute } from "@/lib/bot-api-route";

export const GET = botRoute(async () => {
  return await listActiveTemplates();
});
