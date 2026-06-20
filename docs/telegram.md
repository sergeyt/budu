# Telegram bot & notifications

## Architecture

```
Telegram users / channels
        │
        ▼
   Deno bot (grammY)          bot/src/
        │  HTTP Bearer
        ▼
   Next.js /api/internal/bot/*  →  lib/bot/*  →  Prisma / Postgres
        │
        ▼
   Mini App /tg/events/[id]     initData auth via /api/tg/events/[id]
```

The bot handles Telegram updates (commands, callback buttons, cron). All
database access goes through the Next internal API — see
[`bot/README.md`](../bot/README.md) for routes and env vars.

## Local setup

1. **Next app** — in `.env.local`:

   ```bash
   BOT_INTERNAL_TOKEN=...        # ≥16 chars, shared with bot
   TELEGRAM_BOT_TOKEN=...        # @BotFather; also used for Mini App auth
   TELEGRAM_LINK_SECRET=...      # signs one-time link codes
   ```

2. **Bot** — `cd bot && cp .env.example .env`, match the secrets above, then
   `deno task dev` (long-polling; drops any active webhook automatically).

3. **Link a chat** — super-admin generates a code in the web UI; in Telegram:
   `/link <code>`.

4. **Templates** — `/admin/places/<id>/templates` or bot DM `/new_template`.

5. **Announce** — wait for cron (~1 min) or `/announce_next` in the linked chat.

## Key flows

| Flow | Entry |
| --- | --- |
| Register from announcement | Tap ✅ / ⏳ under the live message |
| Register from DM | `t.me/<bot>?start=ev_<eventId>` |
| Full participant list | Tap **📋 List** (Telegram Mini App) |
| Read templates | `/templates` in a linked chat |
| Unlink chat | `/unlink <code>` |

Registration opens **24 hours before** event start and closes at start time
(same rule on web and bot).

## Announcements

- Posted at `startAt − announceOffsetMinutes` (default 24h; per-template)
- One live message per channel — edits in place, stored in `Event.announcements`
- Channel resolution: **event** overrides **template** overrides **place**
  ([`lib/notifications/effectiveChannels.ts`](../lib/notifications/effectiveChannels.ts))

The bot must be a channel admin with **Post Messages** and **Edit Messages**.

## Mini App

- Page: `/tg/events/[id]`
- API: `GET /api/tg/events/[id]` with header `X-Telegram-Init-Data`
- Validation: [`lib/telegramInitData.ts`](../lib/telegramInitData.ts)

Set `WEB_APP_BASE_URL` in the bot if the public URL differs from
`API_BASE_URL` (production).

## Web registration notifications

After a web register/unregister, [`lib/notifications/notify.ts`](../lib/notifications/notify.ts)
pushes updates to configured channels (Telegram, MAX, …). Sends are
fire-and-forget — they never fail the user's HTTP request.

Legacy [`app/api/webhook/telegram`](../app/api/webhook/telegram/route.ts) may
still exist for link/unlink during migration; the Deno bot is the primary
Telegram entry point.

## Production

- **Next app** — any Node host (Vercel, …); needs `BOT_INTERNAL_TOKEN`,
  `TELEGRAM_BOT_TOKEN`, `SENTRY_DSN` (optional).
- **Bot** — [Deno Deploy](https://deno.com/deploy) or similar; `BOT_MODE=webhook`.
  Details: [`bot/README.md`](../bot/README.md#webhook-mode-prod--deno-deploy).

Both apps need the same `BOT_INTERNAL_TOKEN` and `TELEGRAM_LINK_SECRET`.
