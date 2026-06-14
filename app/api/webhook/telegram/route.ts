import { sendTelegramMessage } from "@/lib/notifications/transports/telegram";
import { errorMiddleware, errors } from "@/lib/error";
import { prisma } from "@/lib/prisma";
import { verifyLinkCode } from "@/lib/telegramLinkCode";

// Optional shared secret to secure the webhook URL
const SECRET = process.env.TELEGRAM_WEBHOOK_SECRET;

type Params = { secret?: string };

export const POST = errorMiddleware<Params>(async (req, ctx) => {
  const { params } = ctx;
  const { secret } = await params;
  if (SECRET && secret !== SECRET) {
    throw errors.badWebhookSecret();
  }

  const update = await req.json();
  const chat = update.message.chat;
  const chatId: number = chat?.id;
  const text: string | undefined = update.message.text?.trim();
  const username = chat?.username || chat?.first_name || "there";

  // /start: greet + show chat id
  if (!text || text === "/start") {
    await sendTelegramMessage({
      chatId,
      text:
        `👋 Hi ${username}!\n\n` +
        `Your chat ID is:\n<code>${chatId}</code>\n\n` +
        `To link a place, send:\n<code>/link &lt;code&gt;</code>\n` +
        `To unlink, send:\n<code>/unlink &lt;code&gt;</code>`,
      parseMode: "HTML",
      disableWebPagePreview: true,
    });
    return;
  }

  // /link <code>
  if (text.startsWith("/link")) {
    const [, code] = text.split(/\s+/, 2);
    if (!code) {
      await sendTelegramMessage({ chatId, text: "Usage: /link <code>" });
      return;
    }

    const link = verifyLinkCode(code);
    if (!link.ok) {
      await sendTelegramMessage({
        chatId,
        text: `❌ Link failed: ${link.error}`,
      });
      return;
    }

    // Upsert TELEGRAM channel for this place
    const { placeId } = link;
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      await sendTelegramMessage({
        chatId,
        text: `❌ Place not found: ${placeId}`,
      });
      return;
    }
    const target = String(chatId);

    await prisma.placeNotificationChannel.upsert({
      where: {
        placeId_type_target: { placeId, type: "TELEGRAM", target },
      },
      update: {},
      create: { placeId, type: "TELEGRAM", target, label: "Owner" },
    });

    await sendTelegramMessage({
      chatId,
      text: `✅ Linked this chat to Place: ${place.name} (<code>${placeId}</code>)`,
      parseMode: "HTML",
    });

    return;
  }

  // /unlink <code>
  if (text.startsWith("/unlink")) {
    const [, code] = text.split(/\s+/, 2);
    if (!code) {
      await sendTelegramMessage({ chatId, text: "Usage: /unlink <code>" });
      return;
    }

    const link = verifyLinkCode(code);
    if (!link.ok) {
      await sendTelegramMessage({
        chatId,
        text: `❌ Unlink failed: ${link.error}`,
      });
      return;
    }

    const { placeId } = link;
    const place = await prisma.place.findUnique({ where: { id: placeId } });
    if (!place) {
      await sendTelegramMessage({
        chatId,
        text: `❌ Place not found: ${placeId}`,
      });
      return;
    }
    const target = String(chatId);

    const deleted = await prisma.placeNotificationChannel.deleteMany({
      where: { placeId, type: "TELEGRAM", target },
    });

    await sendTelegramMessage({
      chatId,
      text:
        deleted.count > 0
          ? `🗑️ Unlinked this chat from Place: ${place.name} (<code>${placeId}</code>)`
          : `ℹ️ No existing link for Place: ${place.name} (<code>${placeId}</code>)`,
      parseMode: "HTML",
    });

    return;
  }

  // Fallback
  await sendTelegramMessage({
    chatId,
    text: `I didn't recognize that.\nTry /link <code> or /unlink <code>.`,
  });
});
