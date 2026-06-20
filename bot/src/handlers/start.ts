import type { Context } from "grammy";

export async function handleStart(ctx: Context): Promise<void> {
  const chat = ctx.chat;
  const chatId = chat?.id;
  const name = chat && "first_name" in chat
    ? chat.first_name
    : chat && "title" in chat
    ? chat.title
    : "there";

  await ctx.reply(
    `👋 Привет, ${name}!\n\n` +
      `Это чат: <code>${chatId}</code>\n\n` +
      `Команды:\n` +
      `• <code>/link &lt;код&gt;</code> — привязать этот чат к месту\n` +
      `• <code>/unlink &lt;код&gt;</code> — отвязать\n` +
      `• <code>/announce_next</code> — опубликовать анонс ближайшего события\n` +
      `• <code>/help</code> — помощь`,
    { parse_mode: "HTML", link_preview_options: { is_disabled: true } },
  );
}

export async function handleHelp(ctx: Context): Promise<void> {
  await ctx.reply(
    "Доступные команды:\n" +
      "/start — приветствие и id чата\n" +
      "/link <код> — привязать чат к месту\n" +
      "/unlink <код> — отвязать\n" +
      "/announce_next — анонс ближайшего события привязанного места",
  );
}
