# budu bot

Telegram bot for [`budu`](../README.md) built on [grammY](https://grammy.dev) +
Deno. Shares the Postgres database with the Next.js app; the schema is owned by
[`prisma/schema.prisma`](../prisma/schema.prisma).

## What works today (through M3)

- `/start`, `/help` — onboarding + chat id discovery
- `/start ev_<eventId>` — deep link: creates a bot user if needed, shows the
  event with inline registration buttons
- `/link <code>` / `/unlink <code>` — bind a Telegram chat to a Place via a
  one-time signed code (`TELEGRAM_LINK_SECRET` must match the Next app)
- `/templates` — read-only listing of templates for linked places
- `/announce_next` — manual nudge: posts the next upcoming event for every
  linked place
- **Scheduled cron** (every minute): materializes template events 8 days ahead,
  then posts announcements when `startAt - announceOffsetMinutes` arrives
- Announcements go to effective TELEGRAM channels (event-level overrides place)
- Inline keyboard: **✅ Я иду** / **⏳ Резерв** / **❌ Отмена** / **📋 Список**
  (HMAC-signed `callback_data`, ≤64 bytes)
- Tapping register/cancel runs the capacity FSM under `pg_advisory_xact_lock`
  (same invariant as the Next app), then edits the live announcement after a
  ≥5s debounce
- **📋 Список** DMs the tapper the full participant list (Mini App deferred to M4)
- Registration window: opens 24h before start, closes at start (mirrors web app)

Not yet wired: Mini App (M4), bot-side template wizard (M4), per-template channel
overrides at announce time (M4). Bot-only users get a `User` row keyed by
`telegramUserId`; they can link to OAuth web accounts later.

## Quick start (local, long-polling — no ngrok needed)

```bash
cd bot
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN, TELEGRAM_LINK_SECRET, TELEGRAM_CALLBACK_SECRET,
# DATABASE_URL (same as the Next app)
deno task dev
```

The dev task auto-deletes any active webhook before starting `getUpdates`.

### Wire it end-to-end

1. Start the Next app (`pnpm dev`) and ensure places/events/templates exist.
2. Mint a link code from the super-admin console (or any flow calling
   `createLinkCode(placeId)`).
3. DM the bot `/link <code>`.
4. Create a template in `/admin/places/<id>/templates` or wait for the cron to
   materialize seeded templates.
5. Either wait until `startAt - announceOffsetMinutes`, or use `/announce_next`
   to post immediately.
6. Tap the inline buttons — watch the announcement edit after ~5s.

**Deep link test:** `https://t.me/<bot>?start=ev_<eventId>`

For channels: add the bot as admin with **Post Messages** + **Edit Messages**,
then `/link <code>` in the channel.

## Webhook mode (prod / Deno Deploy)

```bash
BOT_MODE=webhook
WEBHOOK_URL=https://your-host.example
WEBHOOK_SECRET=long-random-string
PORT=8080
deno task start
```

On Deno Deploy, `Deno.cron` runs the combined materialize + announce tick every
minute.

## Tests

```bash
deno task test
```

Covers capacity FSM, link codes, callback_data signing, Luxon time helpers,
registration window, and more.

## Layout

```
src/
  main.ts              # entry: polling or webhook server
  bot.ts               # grammY Bot factory
  cron.ts              # materialize + announce scheduler tick
  config.ts            # zod-validated env
  db/
    client.ts          # postgresjs (+ TIMESTAMP UTC codec)
    channels.ts        # effective TELEGRAM channels per event
    events.ts          # lookup + due-for-announce query
    templates.ts       # template listing
    registrations.ts   # FSM under pg_advisory_xact_lock
    announcements.ts   # Event.announcements JSONB
  services/
    materialize.ts     # template → Event rows
    announceScheduler.ts # post due announcements
    announce.ts        # render, post, debounced edit
    registrationWindow.ts
    callbackData.ts    # signed inline payloads
  handlers/
    start.ts           # /start + ev_ deep links
    registration.ts    # callback_query taps
scripts/
  smoke_materialize.ts # one-shot DB smoke test
```
