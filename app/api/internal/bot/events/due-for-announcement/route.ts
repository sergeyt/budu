import { listEventsDueForAnnouncement } from "@/lib/bot/events";
import { botRoute } from "@/lib/bot-api-route";

export const GET = botRoute(async (req) => {
  const nowParam = new URL(req.url).searchParams.get("now");
  const now = nowParam ? new Date(nowParam) : new Date();
  return await listEventsDueForAnnouncement(now);
});
