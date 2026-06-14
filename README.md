# Budu

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![CI](https://github.com/sergeyt/budu/actions/workflows/ci.yml/badge.svg)](https://github.com/sergeyt/budu/actions/workflows/ci.yml)

Event registration app for table-tennis clubs. Users sign in with a Russian
OAuth provider, pick a place, and register for the next event. Each event
has a confirmed list and a reserved (waitlist) list with auto-promotion
when a confirmed registrant unregisters.

## Stack

- Next.js 16 (App Router) + React 19
- Prisma 7 + Postgres (`@prisma/adapter-pg`)
- NextAuth v5, database sessions
- Chakra UI v3, next-intl, Sentry
- Biome (lint + format), Vitest

## Quick start

```bash
cp .env.example .env.local
# fill in DATABASE_URL, AUTH_SECRET, and at least one OAuth provider

pnpm install
pnpm db:migrate     # apply pending Prisma migrations
pnpm db:seed        # optional: seed places and a sample event
pnpm dev
```

App runs at <http://localhost:3000>. See `.env.example` for every
environment variable the app reads.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests (DB-free) |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm test:integration` | Vitest integration tests (needs Postgres 17, see Testing) |
| `pnpm test:integration:local` | Spin up Postgres 17 in Docker, run integration tests, tear down |
| `pnpm lint` / `pnpm fmt` | Biome check / format |
| `pnpm db:migrate` | Run migrations in development |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:seed` | Seed fixtures from `prisma/seed.ts` |

## Authentication

OAuth providers are loaded conditionally — a provider only appears on the
sign-in screen if both its `<NAME>_CLIENT_ID` and `<NAME>_CLIENT_SECRET`
are set. Supported: Yandex ID, VK ID, Sber ID (OIDC), TBank/Tinkoff ID
(OIDC). Sessions are stored in Postgres via the Prisma adapter (not JWT),
which lets `lib/auth.ts` augment sessions with the user's `role`.

## Notifications

Per-place and per-event notification channels (Telegram, MAX Messenger)
are configured in the database — see `PlaceNotificationChannel` and
`EventNotificationChannel` in `prisma/schema.prisma`. Telegram chats are
linked through a one-time `/link <code>` flow handled by
`/api/webhook/telegram`. Set `TELEGRAM_BOT_TOKEN`, `TELEGRAM_LINK_SECRET`,
and (recommended) `TELEGRAM_WEBHOOK_SECRET`.

Notifications are fire-and-forget after each registration: a slow or
failing channel never blocks or fails the user-visible request.

## Testing

Two layers, run independently:

**Unit tests** (`pnpm test`) — no database, no network, fast feedback. Cover
pure logic in `lib/` (registration FSM, error middleware, util, telegram
link codes).

**Integration tests** (`pnpm test:integration`) — exercise route handlers
against a real Postgres 17 (matching Neon prod major version). They cover
the registration flow end-to-end, including the advisory-lock invariant
under concurrent `POST /api/events/:id/register` calls.

Run them locally — one-shot, requires Docker:

```bash
pnpm test:integration:local           # spin up PG 17, run tests, tear down
pnpm test:integration:local -t lock   # forward args to vitest
KEEP=1 pnpm test:integration:local    # keep the container around for iteration
```

If you already have a Postgres instance you want to use, skip the wrapper
and point `DATABASE_URL` directly at it:

```bash
DATABASE_URL='postgresql://user:pass@host:5432/db?schema=public' \
  pnpm test:integration
```

The suite applies all Prisma migrations on startup and truncates every
table between tests, so the same container can be reused across runs.
A safety check refuses to run against a `DATABASE_URL` that doesn't look
disposable; set `ALLOW_NON_TEST_DB=1` to override.

In CI both layers run as separate jobs in `.github/workflows/ci.yml`.

## Schema

Source of truth: [`prisma/schema.prisma`](./prisma/schema.prisma).
Postgres only.

Notable invariants enforced today:

- `@@unique([userId, eventId])` on `Registration` prevents double registrations.
- A Postgres advisory lock per event (see `lib/locks.ts`) serializes
  concurrent `POST/DELETE /api/events/:id/register` calls so confirmed/reserved
  capacity decisions stay consistent. Postgres-only — `lib/locks.ts` is the
  single point of change if you ever migrate engines.

## Deploy

Any Node host works; Vercel is the easiest. Set every variable from
`.env.example`, plus `SENTRY_DSN` if you want error reports. Use managed
Postgres (Neon, Supabase, RDS, …). Run `pnpm db:deploy` on every deploy
(e.g. as part of the build command: `pnpm db:deploy && pnpm build`).

## License

MIT © Sergey Todyshev
