import { verifyTelegramInitData } from "@/lib/telegramInitData";
import { errors } from "@/lib/error";

const HEADER = "x-telegram-init-data";

export function requireTelegramInitData(req: Request) {
  const initData = req.headers.get(HEADER);
  if (!initData) {
    throw errors.unauthorized();
  }
  const token = process.env.TELEGRAM_BOT_TOKEN;
  if (!token) {
    throw errors.botApiNotConfigured();
  }
  const verified = verifyTelegramInitData(initData, token);
  if (!verified) {
    throw errors.unauthorized();
  }
  return verified;
}

export { HEADER as TELEGRAM_INIT_DATA_HEADER };
