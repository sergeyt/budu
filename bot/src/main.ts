import { webhookCallback } from "grammy";
import * as Sentry from "@sentry/deno";
import { loadConfig } from "@/config.ts";
import { createBot, publishCommands } from "@/bot.ts";
import { attachBotToCron, startCron } from "@/cron.ts";

async function main(): Promise<void> {
  const cfg = loadConfig();
  if (cfg.SENTRY_DSN) {
    Sentry.init({ dsn: cfg.SENTRY_DSN, tracesSampleRate: 0.1 });
    (globalThis as { Sentry?: typeof Sentry }).Sentry = Sentry;
    console.log("[bot] Sentry enabled");
  }

  const bot = createBot();
  await bot.init();
  await publishCommands(bot);
  attachBotToCron(bot);
  startCron();
  console.log(`[bot] @${bot.botInfo.username} initialized`);

  if (cfg.BOT_MODE === "polling") {
    // Long-polling can't coexist with an active webhook. Drop any leftover
    // one (e.g. set by the Next app) so getUpdates doesn't 409.
    await bot.api.deleteWebhook({ drop_pending_updates: false });
    console.log("[bot] starting long-polling…");
    await bot.start({
      onStart: (info) =>
        console.log(`[bot] polling as @${info.username} (id=${info.id})`),
    });
    return;
  }

  // webhook mode
  const url = `${cfg.WEBHOOK_URL}/webhook/${cfg.WEBHOOK_SECRET}`;
  await bot.api.setWebhook(url, { drop_pending_updates: false });
  console.log(`[bot] webhook registered at ${url}`);

  const handle = webhookCallback(bot, "std/http");
  const path = `/webhook/${cfg.WEBHOOK_SECRET}`;

  Deno.serve({ port: cfg.PORT }, async (req) => {
    const u = new URL(req.url);
    if (req.method === "GET" && u.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }
    if (u.pathname !== path) {
      return new Response("not found", { status: 404 });
    }
    return await handle(req);
  });
}

if (import.meta.main) {
  main().catch((err) => {
    console.error("[bot] fatal", err);
    try {
      Sentry.captureException(err);
      void Sentry.flush(2000);
    } catch {
      // Sentry optional
    }
    Deno.exit(1);
  });
}
