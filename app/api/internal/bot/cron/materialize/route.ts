import { materializeUpcoming } from "@/lib/bot/materialize";
import { botRoute } from "@/lib/bot-api-route";

export const POST = botRoute(async (req) => {
  let now = new Date();
  if (req.headers.get("content-type")?.includes("application/json")) {
    try {
      const raw = await req.json();
      if (raw && typeof raw === "object" && "now" in raw) {
        const value = (raw as { now?: unknown }).now;
        if (typeof value === "string") {
          now = new Date(value);
        }
      }
    } catch {
      // empty body is fine
    }
  }
  return await materializeUpcoming(now);
});
