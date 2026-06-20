import type { Bot } from "grammy";
import type { BotContext } from "@/context.ts";
import { api } from "@/api/client.ts";
import { postDueAnnouncements } from "@/services/announceScheduler.ts";
import { loadConfig } from "@/config.ts";

let started = false;
let botRef: Bot<BotContext> | undefined;

/** Called from main.ts after bot.init() so the cron tick can post messages. */
export function attachBotToCron(bot: Bot<BotContext>): void {
  botRef = bot;
}

export function startCron(): void {
  if (started) {
    return;
  }
  started = true;

  // deno-lint-ignore no-explicit-any
  const cron = (Deno as any).cron as
    | undefined
    | ((name: string, schedule: string, fn: () => Promise<void>) => void);

  if (typeof cron === "function") {
    cron("bot-tick", "* * * * *", tick);
    console.log(
      "[cron] Deno.cron schedule registered (materialize + announce)",
    );
    return;
  }

  const intervalSec = loadConfig().MATERIALIZE_INTERVAL_SEC;
  console.log(`[cron] local interval mode, every ${intervalSec}s`);
  void tick();
  setInterval(tick, intervalSec * 1000);
}

async function tick(): Promise<void> {
  const t0 = Date.now();
  try {
    const materialized = await api.materialize.upcoming();
    if (materialized.inserted > 0 || materialized.errors.length > 0) {
      console.log(
        `[cron] materialized ${materialized.inserted}/${materialized.scanned} ` +
          `in ${Date.now() - t0}ms` +
          (materialized.errors.length > 0
            ? ` (errors: ${JSON.stringify(materialized.errors)})`
            : ""),
      );
    }

    if (!botRef) {
      return;
    }

    const announced = await postDueAnnouncements(botRef);
    if (announced.posted > 0 || announced.errors.length > 0) {
      console.log(
        `[cron] announced ${announced.posted} messages ` +
          `(${announced.skipped} skipped, ${announced.scanned} events due)` +
          (announced.errors.length > 0
            ? ` (errors: ${JSON.stringify(announced.errors)})`
            : ""),
      );
    }
  } catch (err) {
    console.error("[cron] tick failed", err);
  }
}
