import { webhookCallback } from "grammy";
import * as Sentry from "@sentry/deno";
import { loadConfig, useWebhook, webhookEndpointUrl } from "@/config.ts";
import { createBot, publishCommands } from "@/bot.ts";
import { attachBotToCron, startCron } from "@/cron.ts";
import { deriveWebhookSecretToken } from "@/webhookSecret.ts";

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

  if (!useWebhook()) {
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

  const webhookUrl = webhookEndpointUrl();
  const secretToken = await deriveWebhookSecretToken(cfg.BOT_INTERNAL_TOKEN);
  await bot.api.setWebhook(webhookUrl, {
    drop_pending_updates: false,
    secret_token: secretToken,
  });
  console.log(`[bot] webhook registered at ${webhookUrl}`);

  const handle = webhookCallback(bot, "std/http", { secretToken });

  Deno.serve({ port: cfg.PORT }, async (req) => {
    const u = new URL(req.url);
    if (req.method === "GET" && u.pathname === "/health") {
      return new Response("ok", { status: 200 });
    }
    if (u.pathname !== "/webhook") {
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
