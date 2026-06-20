# budu bot

Telegram bot for [`budu`](../README.md) built on [grammY](https://grammy.dev) +
Deno. Shares the Postgres database with the Next.js app; the schema is owned by
[`prisma/schema.prisma`](../prisma/schema.prisma).

## What works today (M0 + M1 + M1.5)

- `/start`, `/help` — onboarding + chat id discovery
- `/link <code>` / `/unlink <code>` — port of the existing Next webhook flow
  that binds a Telegram chat to a Place via a one-time signed code
  (`TELEGRAM_LINK_SECRET` must match between the Next app and the bot)
- `/announce_next` — admin nudge that posts the next upcoming event for every
  place this chat is linked to, with inline `✅ Я иду` / `❌ Отмена` buttons
- Tapping the buttons runs the capacity FSM under a Postgres advisory lock (same
  invariant as `lib/locks.ts` in the Next app), then edits the announcement
  message in place with the updated participant list
- Edits are debounced to ≥5s per (event, chat) to stay under Telegram's per-chat
  flood limit

Not yet wired: template materialization (M2), scheduled announcements (M3), Mini
App (M4). New bot-only users get a `User` row keyed by `telegramUserId`; they
can be linked to OAuth web accounts later.

## Quick start (local, long-polling — no ngrok needed)

```bash
cd bot
cp .env.example .env
# fill TELEGRAM_BOT_TOKEN (BotFather) and TELEGRAM_LINK_SECRET (must match
# the Next app's value)
deno task dev
```

The dev task auto-deletes any active webhook before starting `getUpdates`, so
you can flip between the Next webhook handler and this bot freely while
developing.

### Wire it end-to-end

1. In another shell, start the Next app (`pnpm dev`) and create a Place if you
   don't have one. Note its `id`.
2. From the Next app, mint a link code for that place (or use any UI you already
   have that calls `createLinkCode(placeId)`).
3. DM the bot `/start` to confirm it's reachable.
4. DM the bot `/link <code>` — you should see `✅ Чат привязан`.
5. Make sure there's an `Event` in the future for that place (either via the web
   admin or `pnpm db:seed` — the seed creates one in ~24h).
6. DM the bot `/announce_next` — it posts the announcement with inline
   register/cancel buttons. Tap them and watch the message edit itself.

To test the channel flow: add the bot to a Telegram channel as admin (needs
**Post Messages** + **Edit Messages** rights), then run `/link
<code>` _in the
channel_ (or DM `/link` and pass the channel chat id — TODO: add `/bind` command
for that).

## Webhook mode (prod / Deno Deploy)

```bash
BOT_MODE=webhook
WEBHOOK_URL=https://your-host.example
WEBHOOK_SECRET=long-random-string
PORT=8080
deno task start
```

Telegram posts updates to `${WEBHOOK_URL}/webhook/${WEBHOOK_SECRET}`. On Deno
Deploy, the `PORT` env var is injected automatically.

## Tests

```bash
deno task test
```

Covers the capacity FSM (mirror of the Next app's
`test/lib/registration.test.ts`), HMAC link-code verification, and
`callback_data` signing.

## Layout

```
src/
  main.ts          # entry: polling or webhook server
  bot.ts           # grammY Bot factory + middleware
  config.ts        # zod-validated env
  db/
    client.ts      # postgresjs (npm:postgres)
    places.ts      # Place + TELEGRAM-channel link upserts
    events.ts      # event lookup + ordered participant list
    users.ts       # find-or-create User by telegramUserId
    registrations.ts # FSM under pg_advisory_xact_lock
    announcements.ts # Event.announcements JSONB read/write
  services/
    capacity.ts    # decideRegistrationStatus (duplicate of
                   #   lib/registration.ts in the Next app)
    linkCode.ts    # HMAC-SHA256 link codes (Web Crypto port of
                   #   lib/telegramLinkCode.ts)
    callbackData.ts # 44-char signed inline button payloads
    announce.ts    # render text + keyboard, post + edit
  handlers/
    start.ts       # /start, /help
    link.ts        # /link, /unlink
    announce.ts    # /announce_next
    registration.ts # callback_query taps
tests/
  capacity.test.ts
  linkCode.test.ts
  callbackData.test.ts
```
