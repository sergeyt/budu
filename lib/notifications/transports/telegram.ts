const API_BASE = "https://api.telegram.org";

type ParseMode = "MarkdownV2" | "Markdown" | "HTML";

type SendMessageOptions = {
  chatId: string | number;
  text: string;
  parseMode?: ParseMode;
  disableWebPagePreview?: boolean;
  replyToMessageId?: number;
  inlineKeyboard?: Array<
    Array<{ text: string; url?: string; callback_data?: string }>
  >;
};

function getBotToken() {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw new Error(
      "TELEGRAM_BOT_TOKEN is not set; configure it to enable Telegram notifications.",
    );
  }
  return token;
}

export function isTelegramConfigured() {
  return !!process.env.TELEGRAM_BOT_TOKEN;
}

async function request<T>(method: string, body: unknown): Promise<T> {
  const res = await fetch(`${API_BASE}/bot${getBotToken()}/${method}`, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body),
  });
  const json = (await res.json()) as { ok: boolean; result: T };
  if (!json.ok) {
    throw new Error(`Telegram API error on ${method}: ${JSON.stringify(json)}`);
  }
  return json.result;
}

function escapeText(text: string, parseMode: ParseMode) {
  if (parseMode === "MarkdownV2" || parseMode === "Markdown") {
    return text.replace(/([_*[\]()~`>#+\-=|{}.!])/g, "\\$1");
  }
  return text;
}

export async function sendTelegramMessage(opts: SendMessageOptions) {
  const {
    chatId,
    text: inputText,
    parseMode = "MarkdownV2",
    disableWebPagePreview,
    replyToMessageId,
    inlineKeyboard,
  } = opts;

  if (!chatId) {
    throw new Error(
      "No chatId provided and TELEGRAM_DEFAULT_CHAT_ID is not set. Either pass opts.chatId or capture/store a chat id.",
    );
  }

  const text = escapeText(inputText, parseMode);

  return request("sendMessage", {
    chat_id: chatId,
    text,
    parse_mode: parseMode,
    disable_web_page_preview: disableWebPagePreview,
    reply_to_message_id: replyToMessageId,
    reply_markup: inlineKeyboard
      ? { inline_keyboard: inlineKeyboard }
      : undefined,
  });
}
