import { z } from "zod";

const Mode = z.enum(["polling", "webhook"]);

const Schema = z.object({
  TELEGRAM_BOT_TOKEN: z.string().min(10),
  DATABASE_URL: z.string().url(),
  TELEGRAM_LINK_SECRET: z.string().min(8),
  TELEGRAM_CALLBACK_SECRET: z.string().min(8),
  BOT_MODE: Mode.default("polling"),
  WEBHOOK_URL: z.string().url().optional(),
  WEBHOOK_SECRET: z.string().optional(),
  PORT: z.coerce.number().int().min(1).max(65535).default(8080),
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
  const cfg = parsed.data;
  if (cfg.BOT_MODE === "webhook") {
    if (!cfg.WEBHOOK_URL) {
      console.error("BOT_MODE=webhook requires WEBHOOK_URL");
      Deno.exit(1);
    }
    if (!cfg.WEBHOOK_SECRET) {
      console.error("BOT_MODE=webhook requires WEBHOOK_SECRET");
      Deno.exit(1);
    }
  }
  cached = cfg;
  return cfg;
}
