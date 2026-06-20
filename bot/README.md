# budu bot

Telegram bot for [`budu`](../README.md) built on [grammY](https://grammy.dev) +
Deno. **Does not connect to Postgres directly** — all data access goes through
the Next.js app's internal REST API (`/api/internal/bot/*`), authenticated
with a shared `BOT_INTERNAL_TOKEN`.

## What works today (through M3)

- `/start`, `/help`, `/start ev_<eventId>` deep links
- `/link` / `/unlink`, `/templates`, `/announce_next`
- Scheduled cron: materialize templates + post due announcements
- Inline registration keyboard with HMAC-signed `callback_data`
- Live announcement edits (debounced ≥5s)

## Quick start (local)

**1. Next app** — add to the root `.env`:

```bash
BOT_INTERNAL_TOKEN=dev-only-internal-token-change-me   # ≥16 chars
```

Then start it: `pnpm dev`

**2. Bot** — configure `bot/.env`:

```bash
cd bot
cp .env.example .env
# TELEGRAM_BOT_TOKEN from @BotFather
# API_BASE_URL=http://localhost:3000
# BOT_INTERNAL_TOKEN must match the Next app
# TELEGRAM_LINK_SECRET must match the Next app
deno task dev
```

The dev task auto-deletes any active webhook before starting long-polling.

### Wire it end-to-end

1. Link a chat: `/link <code>` (code from super-admin console).
2. Create templates in `/admin/places/<id>/templates`.
3. Wait for cron or use `/announce_next`.
4. Deep link: `https://t.me/<bot>?start=ev_<eventId>`

## Internal API

All routes live under `/api/internal/bot/` and require:

```
Authorization: Bearer <BOT_INTERNAL_TOKEN>
```

| Route | Purpose |
|-------|---------|
| `POST /users/telegram` | find-or-create bot user |
| `GET /places/:id` | place lookup |
| `POST/DELETE /places/:id/telegram` | link/unlink chat |
| `GET /places/by-chat/:chatId` | places for a chat |
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

Business logic lives in `lib/bot/*` on the Next side (Prisma + advisory locks).

## Webhook mode (prod / Deno Deploy)

```bash
BOT_MODE=webhook
WEBHOOK_URL=https://your-host.example
WEBHOOK_SECRET=long-random-string
API_BASE_URL=https://your-next-app.example
BOT_INTERNAL_TOKEN=...
deno task start
```

## Tests

```bash
deno task test
```

Pure unit tests (capacity, link codes, callback_data, time helpers) run
without the Next app. Integration smoke:

```bash
deno run --allow-env --allow-net --allow-read --allow-import \
  --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
```

(requires Next app running with matching `BOT_INTERNAL_TOKEN`)

## Layout

```
src/
  main.ts              # polling or webhook server
  cron.ts              # materialize + announce tick (via API)
  config.ts            # API_BASE_URL, BOT_INTERNAL_TOKEN, …
  api/                 # HTTP client for /api/internal/bot/*
  services/            # Telegram-facing logic (announce, callbacks, time)
  handlers/            # grammY command + callback handlers
```
