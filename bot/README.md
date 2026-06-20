# budu bot

Telegram bot for [`budu`](../README.md) built on [grammY](https://grammy.dev) +
Deno. **Does not connect to Postgres directly** — all data access goes through
the Next.js app's internal REST API (`/api/internal/bot/*`), authenticated
with a shared `BOT_INTERNAL_TOKEN`.

## What works today (through M4)

- `/start`, `/help`, `/start ev_<eventId>` deep links
- `/link` / `/unlink`, `/templates`, `/announce_next`
- `/new_template` — DM wizard for place admins (grammy-conversations)
- Scheduled cron: materialize templates + post due announcements
- Inline registration keyboard with HMAC-signed `callback_data`
- **📋 List** opens a Telegram Mini App (`/tg/events/[id]`, `initData` auth)
- Live announcement edits (debounced ≥5s)
- ru/en command menus and user-facing strings (`bot/messages/`)
- Optional Sentry (`SENTRY_DSN`)

## Quick start (local)

**1. Next app** — add to the root `.env`:

```bash
BOT_INTERNAL_TOKEN=dev-only-internal-token-change-me   # ≥16 chars
TELEGRAM_BOT_TOKEN=...                               # also used for Mini App auth
```

Then start it: `pnpm dev`

**2. Bot** — configure `bot/.env`:

```bash
cd bot
cp .env.example .env
# TELEGRAM_BOT_TOKEN from @BotFather
# API_BASE_URL=http://localhost:3000
# WEB_APP_BASE_URL=http://localhost:3000   # optional; defaults to API_BASE_URL
# BOT_INTERNAL_TOKEN must match the Next app
# TELEGRAM_LINK_SECRET must match the Next app
# SENTRY_DSN=...                           # optional
deno task dev
```

The dev task auto-deletes any active webhook before starting long-polling.

### Wire it end-to-end

1. Link a chat: `/link <code>` (code from super-admin console).
2. Create templates in `/admin/places/<id>/templates` (or `/new_template` in DM).
3. Optional: add per-template Telegram channel overrides in the admin UI.
4. Wait for cron or use `/announce_next`.
5. Deep link: `https://t.me/<bot>?start=ev_<eventId>`
6. Tap **📋 List** on an announcement to open the Mini App participant view.

## Internal API

All routes live under `/api/internal/bot/` and require:

```
Authorization: Bearer <BOT_INTERNAL_TOKEN>
```

| Route | Purpose |
|-------|---------|
| `POST /users/telegram` | find-or-create bot user |
| `GET /users/:telegramUserId/admin-places` | places a linked TG user administers |
| `GET /places/:id` | place lookup |
| `POST/DELETE /places/:id/telegram` | link/unlink chat |
| `GET /places/by-chat/:chatId` | places for a chat |
| `POST /places/:id/templates` | create template (bot wizard) |
| `GET /events/:id` | event details |
| `GET /events/next?placeId=` | next upcoming event |
| `GET /events/due-for-announcement` | scheduler query |
| `GET /events/:id/participants` | participant list |
| `GET/PUT /events/:id/announcements` | live message refs |
| `GET /events/:id/telegram-channels` | announce targets |
| `POST/DELETE /events/:id/register` | register / cancel |
| `GET /templates/active` | enabled templates |
| `GET /templates/by-chat/:chatId` | templates for linked chat |
| `POST /cron/materialize` | materialize upcoming events |

Public Mini App API (Telegram `initData`, not bot token):

| Route | Purpose |
|-------|---------|
| `GET /api/tg/events/:id` | event + full participant list |

Business logic lives in `lib/bot/*` on the Next side (Prisma + advisory locks).

## Production (Deno Deploy)

Set the bot’s public HTTPS origin — webhook registration is automatic on startup:

```bash
BOT_PUBLIC_URL=https://your-bot.deno.dev
API_BASE_URL=https://your-next-app.example
WEB_APP_BASE_URL=https://your-next-app.example
BOT_INTERNAL_TOKEN=...   # must match Next app; also derives webhook secret
deno task start
```

Telegram receives `POST {BOT_PUBLIC_URL}/webhook`. No `BOT_MODE`, no manual
`setWebhook` script. Unset `BOT_PUBLIC_URL` for long-polling (local dev).

## Tests

```bash
deno task test
```

Pure unit tests (capacity, link codes, callback_data, time helpers, i18n) run
without the Next app. Integration smoke:

```bash
deno run --allow-env --allow-net --allow-read --allow-import \
  --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
```

(requires Next app running with matching `BOT_INTERNAL_TOKEN`)

Manual E2E checklist: [`../docs/bot-test-plan.md`](../docs/bot-test-plan.md).

## Layout

```
src/
  main.ts              # polling (default) or webhook when BOT_PUBLIC_URL is set
  cron.ts              # materialize + announce tick (via API)
  config.ts            # API_BASE_URL, BOT_INTERNAL_TOKEN, WEB_APP_BASE_URL, …
  i18n.ts              # ru/en string lookup
  api/                 # HTTP client for /api/internal/bot/*
  services/            # Telegram-facing logic (announce, callbacks, time)
  handlers/            # grammY command + callback handlers + template wizard
messages/
  en.json, ru.json
```
