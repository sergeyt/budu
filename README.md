# Budu

[![License: MIT](https://img.shields.io/badge/License-MIT-green.svg)](./LICENSE)
[![CI](https://github.com/sergeyt/budu/actions/workflows/ci.yml/badge.svg)](https://github.com/sergeyt/budu/actions/workflows/ci.yml)

Event registration for table-tennis clubs. Players sign in with a Russian
OAuth provider, pick a place, and register for the next event — confirmed
seats plus a waitlist with auto-promotion when someone cancels.

Place admins manage weekly **event templates** in the web UI. A **Telegram
bot** materializes events, posts announcements to linked channels, and
handles inline registration. A **Mini App** shows the full participant list.

## Stack

| Layer | Tools |
| --- | --- |
| Web | Next.js 16 (App Router), React 19, Chakra UI v3, next-intl |
| Auth | NextAuth v5 (database sessions, Prisma adapter) |
| Data | Prisma 7 + **Postgres** (`@prisma/adapter-pg`) — required (advisory locks, `TIME`) |
| Bot | Deno 2 + grammY — HTTP client only; see [`bot/README.md`](./bot/README.md) |
| Quality | Biome, Vitest; optional Sentry |

The bot does **not** talk to Postgres. It calls the Next app at
`/api/internal/bot/*` (Bearer `BOT_INTERNAL_TOKEN`); business logic lives in
[`lib/bot/`](./lib/bot/).

## Quick start

```bash
cp .env.example .env.local
# DATABASE_URL (Postgres), AUTH_SECRET, and at least one OAuth provider

pnpm install
pnpm db:migrate
pnpm db:seed        # optional
pnpm dev            # http://localhost:3000
```

Env vars: [`.env.example`](./.env.example).

**Telegram bot (optional):** start the Next app, then follow
[`bot/README.md`](./bot/README.md). Match `BOT_INTERNAL_TOKEN`,
`TELEGRAM_BOT_TOKEN`, and `TELEGRAM_LINK_SECRET` in both apps.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests (DB-free) |
| `pnpm test:integration:local` | Postgres 17 in Docker + integration tests |
| `pnpm test:e2e:local` | Compose up + Playwright + report + down |
| `pnpm test:e2e:headed` | Same, with a visible browser |
| `pnpm lint` / `pnpm fmt` | Biome check / format |
| `pnpm db:migrate` / `pnpm db:deploy` | Migrations (dev / production) |
| `pnpm db:seed` | Seed fixtures from `prisma/seed.ts` |

Bot: `cd bot && deno task dev` · `deno task test` · `deno task check`

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/telegram.md](./docs/telegram.md) | Bot, announcements, Mini App, link flow |
| [docs/testing.md](./docs/testing.md) | Unit vs integration tests |
| [bot/README.md](./bot/README.md) | Bot env, internal API routes |
| [bot/DEPLOY.md](./bot/DEPLOY.md) | Bot on a VPS (Docker Compose) |
| [AGENTS.md](./AGENTS.md) | Conventions for AI agents |
| [TODO.md](./TODO.md) | Milestones and backlog |

## Features

- OAuth sign-in (Yandex, VK, Sber ID, TBank — each optional via env)
- Place picker, register / unregister, waitlist promotion
- `/admin` — template CRUD, per-template Telegram channel overrides
- Mini App at `/tg/events/[id]` (Telegram `initData` auth)
- Bot: `/link`, template materialization, announcements, inline registration,
  `/new_template` wizard, ru/en menus
- Fire-and-forget notifications (Telegram, MAX, …) — never block the HTTP response

## Schema & invariants

Source of truth: [`prisma/schema.prisma`](./prisma/schema.prisma).

- `@@unique([userId, eventId])` on `Registration`
- Postgres advisory lock per event ([`lib/locks.ts`](./lib/locks.ts))
- Registration FSM: [`lib/registration.ts`](./lib/registration.ts)

Sessions are stored in Postgres (not JWT) so `lib/auth.ts` can attach `role`
and `PlaceAdmin` membership.

## Deploy

Typical setup:

| Piece | Where |
| --- | --- |
| Next.js (API + UI) | Vercel |
| Postgres | Managed (e.g. Neon) |
| Telegram bot | VPS + Docker Compose — [`bot/DEPLOY.md`](./bot/DEPLOY.md) |

On each web deploy: `pnpm db:deploy && pnpm build`. Set variables from
`.env.example` (optional `SENTRY_DSN`).

## License

MIT © Sergey Todyshev
