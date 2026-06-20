import { materializeUpcoming } from "@/services/materialize.ts";
import { loadConfig } from "@/config.ts";

/**
 * Scheduling glue. On Deno Deploy `Deno.cron` is the right primitive
 * (durable, exactly-once per slot, survives restarts). Locally we fall
 * back to a `setInterval` loop so `deno task dev` actually exercises the
 * materializer without juggling a CI scheduler.
 *
 * Single-instance assumption: the planner is idempotent (unique
 * `templateId, startAt`), so even if both paths fire we won't duplicate
 * Events — but the interval path is silently skipped in environments
 * where `Deno.cron` is available.
 */
let started = false;

export function startCron(): void {
  if (started) return;
  started = true;

  // `Deno.cron` is only defined on Deno Deploy. Detect at runtime.
  // deno-lint-ignore no-explicit-any
  const cron = (Deno as any).cron as
    | undefined
    | ((name: string, schedule: string, fn: () => Promise<void>) => void);

  if (typeof cron === "function") {
    // Every minute. The materializer projects 8 days ahead, so the
    // exact tick frequency doesn't matter — anything ≤ 1h is fine.
    cron("materialize-templates", "* * * * *", tick);
    console.log("[cron] Deno.cron schedule registered");
    return;
  }

  const intervalSec = loadConfig().MATERIALIZE_INTERVAL_SEC;
  console.log(`[cron] local interval mode, every ${intervalSec}s`);
  // Run once immediately so dev iterations get instant feedback.
  void tick();
  setInterval(tick, intervalSec * 1000);
}

async function tick(): Promise<void> {
  const t0 = Date.now();
  try {
    const r = await materializeUpcoming();
    if (r.inserted > 0 || r.errors.length > 0) {
      console.log(
        `[cron] materialized ${r.inserted}/${r.scanned} templates ` +
          `in ${Date.now() - t0}ms` +
          (r.errors.length > 0 ? ` (errors: ${JSON.stringify(r.errors)})` : ""),
      );
    }
  } catch (err) {
    console.error("[cron] materialize tick failed", err);
  }
}
