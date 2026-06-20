import { apiFetch } from "./client.ts";
import type { MaterializeResult } from "./types.ts";

export async function materializeUpcoming(
  now: Date = new Date(),
): Promise<MaterializeResult> {
  return await apiFetch<MaterializeResult>(
    "/api/internal/bot/cron/materialize",
    { method: "POST", body: { now: now.toISOString() } },
  );
}
