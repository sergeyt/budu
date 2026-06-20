import { createHmac, timingSafeEqual } from "node:crypto";

export type TelegramWebAppUser = {
  id: number;
  first_name: string;
  last_name?: string;
  username?: string;
  language_code?: string;
  is_premium?: boolean;
};

export type VerifiedInitData = {
  user?: TelegramWebAppUser;
  authDate: Date;
  queryId?: string;
  chatInstance?: string;
};

const MAX_AGE_SEC = 24 * 60 * 60;

function buildDataCheckString(params: URLSearchParams): string {
  const pairs: string[] = [];
  for (const [key, value] of params.entries()) {
    if (key !== "hash") {
      pairs.push(`${key}=${value}`);
    }
  }
  pairs.sort((a, b) => a.localeCompare(b));
  return pairs.join("\n");
}

/**
 * Validate Telegram Mini App `initData` per
 * https://core.telegram.org/bots/webapps#validating-data-received-via-the-mini-app
 */
export function verifyTelegramInitData(
  initData: string,
  botToken: string,
  nowSec: number = Math.floor(Date.now() / 1000),
): VerifiedInitData | null {
  const params = new URLSearchParams(initData);
  const hash = params.get("hash");
  if (!hash) {
    return null;
  }

  const authDateRaw = params.get("auth_date");
  if (!authDateRaw) {
    return null;
  }
  const authDateSec = Number(authDateRaw);
  if (!Number.isFinite(authDateSec) || nowSec - authDateSec > MAX_AGE_SEC) {
    return null;
  }

  const dataCheckString = buildDataCheckString(params);
  const secretKey = createHmac("sha256", "WebAppData")
    .update(botToken)
    .digest();
  const expected = createHmac("sha256", secretKey)
    .update(dataCheckString)
    .digest("hex");

  const a = Buffer.from(expected, "hex");
  const b = Buffer.from(hash, "hex");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  let user: TelegramWebAppUser | undefined;
  const userRaw = params.get("user");
  if (userRaw) {
    try {
      user = JSON.parse(userRaw) as TelegramWebAppUser;
    } catch {
      return null;
    }
  }

  return {
    user,
    authDate: new Date(authDateSec * 1000),
    queryId: params.get("query_id") ?? undefined,
    chatInstance: params.get("chat_instance") ?? undefined,
  };
}
