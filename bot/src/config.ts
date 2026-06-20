import { z } from "zod";

const Schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  /** Next.js app base URL for the internal bot API. */
  API_BASE_URL: z.string().url().default("http://localhost:3000"),
  /** Shared secret — must match BOT_INTERNAL_TOKEN in the Next app. */
  BOT_INTERNAL_TOKEN: z.string().min(16),
  TELEGRAM_LINK_SECRET: z.string().min(8),
  /**
   * Public HTTPS origin of this bot service (no trailing slash).
   * When set, the bot registers `POST {origin}/webhook` with Telegram on startup.
   * When unset, uses long-polling (local dev).
   */
  BOT_PUBLIC_URL: z.string().url().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
  MATERIALIZE_INTERVAL_SEC: z.coerce.number().int().min(5).max(3600).default(
    60,
  ),
  /** Public URL for Mini App links (defaults to API_BASE_URL). */
  WEB_APP_BASE_URL: z.string().url().optional(),
  /** Optional Sentry DSN for error reporting. */
  SENTRY_DSN: z.string().url().optional(),
});

export type Config = z.infer<typeof Schema>;

let cached: Config | undefined;

export function loadConfig(): Config {
  if (cached) return cached;
  const parsed = Schema.safeParse(Deno.env.toObject());
  if (!parsed.success) {
    const tree = z.treeifyError(parsed.error);
    console.error("Invalid environment:", JSON.stringify(tree, null, 2));
    Deno.exit(1);
  }
  cached = parsed.data;
  return cached;
}

export function useWebhook(): boolean {
  return !!loadConfig().BOT_PUBLIC_URL;
}

export function webhookEndpointUrl(): string {
  const base = loadConfig().BOT_PUBLIC_URL?.replace(/\/+$/, "");
  if (!base) {
    throw new Error("BOT_PUBLIC_URL is not set");
  }
  return `${base}/webhook`;
}

/** Base URL for Mini App links embedded in inline keyboards. */
export function webAppBaseUrl(): string {
  const cfg = loadConfig();
  return cfg.WEB_APP_BASE_URL ?? cfg.API_BASE_URL;
}
