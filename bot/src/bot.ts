import { Bot } from "grammy";
import { loadConfig } from "@/config.ts";
import { handleHelp, handleStart } from "@/handlers/start.ts";
import { handleLink, handleUnlink } from "@/handlers/link.ts";
import { handleAnnounceNext } from "@/handlers/announce.ts";
import { handleCallbackQuery } from "@/handlers/registration.ts";
import { handleTemplates } from "@/handlers/templates.ts";

export function createBot(): Bot {
  const bot = new Bot(loadConfig().TELEGRAM_BOT_TOKEN);

  bot.catch((err) => {
    console.error("[bot] unhandled error in handler", {
      updateId: err.ctx.update.update_id,
      err: err.error,
    });
  });

  bot.command("start", handleStart);
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
export async function publishCommands(bot: Bot): Promise<void> {
  await bot.api.setMyCommands([
    { command: "start", description: "Старт" },
    { command: "help", description: "Помощь" },
    { command: "link", description: "Привязать чат к месту" },
    { command: "unlink", description: "Отвязать" },
    { command: "announce_next", description: "Анонс ближайшего события" },
    { command: "templates", description: "Шаблоны привязанного места" },
  ]);
}
