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
| Web app | [Next.js 16](https://nextjs.org) (App Router), [React 19](https://react.dev) |
| UI | [Chakra UI v3](https://chakra-ui.com), [next-themes](https://github.com/pacocoursey/next-themes), [react-icons](https://react-icons.github.io/react-icons/) |
| i18n | [next-intl](https://next-intl.dev) |
| Auth | [NextAuth v5](https://authjs.dev) (database sessions, Prisma adapter) |
| Data | [Prisma 7](https://www.prisma.io) + Postgres via [`@prisma/adapter-pg`](https://www.prisma.io/docs/orm/overview/databases/postgresql) and [`pg`](https://node-postgres.com) |
| Validation | [Zod 4](https://zod.dev) |
| Time | [Luxon](https://moment.github.io/luxon/) (template scheduling, IANA timezones on `Place`) |
| Observability | [Sentry](https://sentry.io) — `@sentry/nextjs` on the web app, `@sentry/deno` in the bot (optional `SENTRY_DSN`) |
| Quality | [Biome](https://biomejs.dev) (lint + format), [Vitest](https://vitest.dev) |
| Telegram bot | [Deno 2](https://deno.com) + [grammY](https://grammy.dev), [grammy-conversations](https://github.com/grammyjs/conversations) — see [`bot/README.md`](./bot/README.md) |

The bot does **not** connect to Postgres. It calls the Next app at
`/api/internal/bot/*` (Bearer `BOT_INTERNAL_TOKEN`); business logic lives in
[`lib/bot/`](./lib/bot/).

## Quick start

```bash
cp .env.example .env.local
# DATABASE_URL, AUTH_SECRET, and at least one OAuth provider

pnpm install
pnpm db:migrate
pnpm db:seed        # optional
pnpm dev            # http://localhost:3000
```

Environment variables are documented in [`.env.example`](./.env.example).

**Telegram bot (optional):** start the Next app first, then follow
[`bot/README.md`](./bot/README.md). You need matching `BOT_INTERNAL_TOKEN`,
`TELEGRAM_BOT_TOKEN`, and `TELEGRAM_LINK_SECRET` in both apps.

## Scripts

| Command | Description |
| --- | --- |
| `pnpm dev` | Next dev server |
| `pnpm build` / `pnpm start` | Production build / serve |
| `pnpm test` / `pnpm test:watch` | Vitest unit tests (DB-free) |
| `pnpm test:coverage` | Vitest with v8 coverage |
| `pnpm test:integration:local` | Postgres 17 in Docker + integration tests |
| `pnpm lint` / `pnpm fmt` | Biome check / format |
| `pnpm db:migrate` | Run migrations in development |
| `pnpm db:deploy` | Apply migrations in production |
| `pnpm db:seed` | Seed fixtures from `prisma/seed.ts` |

Bot: `cd bot && deno task dev` · `deno task test` · `deno task check`

## Documentation

| Doc | Contents |
| --- | --- |
| [docs/telegram.md](./docs/telegram.md) | Bot, announcements, Mini App, link flow |
| [docs/testing.md](./docs/testing.md) | Unit vs integration tests, local Postgres |
| [bot/README.md](./bot/README.md) | Bot env, internal API routes, Fly.io deploy |
| [AGENTS.md](./AGENTS.md) | Conventions for AI agents |
| [CODEREVIEW.md](./CODEREVIEW.md) | Code review checklist |
| [TODO.md](./TODO.md) | Milestones and backlog |

## Features (high level)

**Web**

- OAuth sign-in (Yandex, VK, Sber ID, TBank — each optional via env)
- Place picker, register / unregister for the next event
- Admin UI at `/admin` — template CRUD, per-template Telegram channel overrides
- Mini App at `/tg/events/[id]` (Telegram `initData` auth)

**Telegram bot**

- Link a chat to a place (`/link <code>`), weekly template materialization, scheduled announcements
- Inline keyboard: register, waitlist, cancel; **📋 List** opens the Mini App
- DM `/new_template` wizard for place admins; ru/en command menus

**Notifications**

- Per-place, per-template, and per-event channel overrides (Telegram, MAX, …)
- Fire-and-forget after registration — slow channels never block the HTTP response

## Authentication

Providers load conditionally: a button appears only when both
`<NAME>_CLIENT_ID` and `<NAME>_CLIENT_SECRET` are set. Sessions live in
Postgres (not JWT) so `lib/auth.ts` can attach the user's `role` and
`PlaceAdmin` membership.

## Schema & invariants

Source of truth: [`prisma/schema.prisma`](./prisma/schema.prisma).

- `@@unique([userId, eventId])` on `Registration` — no double sign-ups
- Postgres advisory lock per event ([`lib/locks.ts`](./lib/locks.ts)) — concurrent register/unregister stays consistent
- Registration FSM: [`lib/registration.ts`](./lib/registration.ts)

## Deploy

Any Node host works; Vercel is the simplest path. Use managed Postgres
(Neon, Supabase, RDS, …). On each deploy:

```bash
pnpm db:deploy && pnpm build
```

Set variables from `.env.example`. Optional: `SENTRY_DSN` for error reporting.
Run the bot separately (e.g. Deno Deploy) — see [docs/telegram.md](./docs/telegram.md).

## License

MIT © Sergey Todyshev
