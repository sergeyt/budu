import { Bot, session } from "grammy";
import { loadConfig } from "@/config.ts";
import type { BotContext } from "@/context.ts";
import { handleHelp, handleStart } from "@/handlers/start.ts";
import { handleLink, handleUnlink } from "@/handlers/link.ts";
import { handleAnnounceNext } from "@/handlers/announce.ts";
import { handleCallbackQuery } from "@/handlers/registration.ts";
import { handleTemplates } from "@/handlers/templates.ts";
import { registerTemplateWizard } from "@/handlers/templateWizard.ts";
import { commandDescriptions, type Locale } from "@/i18n.ts";

export function createBot(): Bot<BotContext> {
  const bot = new Bot<BotContext>(loadConfig().TELEGRAM_BOT_TOKEN);

  bot.use(session({ initial: () => ({}) }));
  registerTemplateWizard(bot);

  bot.catch((err) => {
    console.error("[bot] unhandled error in handler", {
      updateId: err.ctx.update.update_id,
      err: err.error,
    });
    try {
      const Sentry = globalThis as {
        Sentry?: { captureException: (e: unknown) => void };
      };
      Sentry.Sentry?.captureException(err.error);
    } catch {
      // Sentry optional
    }
  });

  bot.command("start", handleStart(bot));
  bot.command("help", handleHelp);
  bot.command("link", handleLink);
  bot.command("unlink", handleUnlink);
  bot.command("announce_next", handleAnnounceNext(bot));
  bot.command("templates", handleTemplates);

  bot.on("callback_query:data", handleCallbackQuery(bot));

  return bot;
}

/**
 * Publish command suggestions to Telegram so they show up in the in-app
 * menu / `/` autocomplete. Safe to call repeatedly.
 */
export async function publishCommands(bot: Bot<BotContext>): Promise<void> {
  const locales: Locale[] = ["ru", "en"];
  for (const locale of locales) {
    const c = commandDescriptions(locale);
    await bot.api.setMyCommands([
      { command: "start", description: c.start },
      { command: "help", description: c.help },
      { command: "link", description: c.link },
      { command: "unlink", description: c.unlink },
      { command: "announce_next", description: c.announce_next },
      { command: "templates", description: c.templates },
      { command: "new_template", description: c.new_template },
    ], { language_code: locale });
  }
  const c = commandDescriptions("ru");
  await bot.api.setMyCommands([
    { command: "start", description: c.start },
    { command: "help", description: c.help },
    { command: "link", description: c.link },
    { command: "unlink", description: c.unlink },
    { command: "announce_next", description: c.announce_next },
    { command: "templates", description: c.templates },
    { command: "new_template", description: c.new_template },
  ]);
}
