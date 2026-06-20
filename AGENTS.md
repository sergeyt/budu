# AGENTS.md

Behavioral guidelines for AI agents working in **budu**. Merge with
project-specific instructions in `.cursor/rules/` or user rules as needed.

**Tradeoff:** These guidelines bias toward caution over speed. For trivial
tasks, use judgment.

## 1. Think Before Coding

**Don't assume. Don't hide confusion. Surface tradeoffs.**

Before implementing:

- State your assumptions explicitly. If uncertain, ask.
- If multiple interpretations exist, present them — don't pick silently.
- If a simpler approach exists, say so. Push back when warranted.
- If something is unclear, stop. Name what's confusing. Ask.

## 2. Simplicity First

**Minimum code that solves the problem. Nothing speculative.**

- No features beyond what was asked.
- No abstractions for single-use code.
- No "flexibility" or "configurability" that wasn't requested.
- No error handling for impossible scenarios.
- If you write 200 lines and it could be 50, rewrite it.

Ask yourself: "Would a senior engineer say this is overcomplicated?" If yes,
simplify.

## 3. Surgical Changes

**Touch only what you must. Clean up only your own mess.**

When editing existing code:

- Don't "improve" adjacent code, comments, or formatting.
- Don't refactor things that aren't broken.
- Match existing style, even if you'd do it differently.
- If you notice unrelated dead code, mention it — don't delete it.

When your changes create orphans:

- Remove imports/variables/functions that **your** changes made unused.
- Don't remove pre-existing dead code unless asked.

The test: every changed line should trace directly to the user's request.

## 4. Goal-Driven Execution

**Define success criteria. Loop until verified.**

Transform tasks into verifiable goals:

- "Add validation" → write tests for invalid inputs, then make them pass
- "Fix the bug" → write a test that reproduces it, then make it pass
- "Refactor X" → ensure tests pass before and after

For multi-step tasks, state a brief plan:

```
1. [Step] → verify: [check]
2. [Step] → verify: [check]
```

Strong success criteria let you loop independently. Weak criteria ("make it
work") require constant clarification.

---

## 5. Project Overview

**budu** is an event-registration app for table-tennis clubs.

| Area | Stack |
| --- | --- |
| Web app | Next.js 16 (App Router), React 19, Chakra UI v3, next-intl |
| Data | Prisma 7 + Postgres; schema in `prisma/schema.prisma` |
| Auth | NextAuth v5, database sessions, Russian OAuth providers |
| Bot | Deno 2 + grammY in `bot/` — **no direct Postgres access** |
| Tooling | Biome (lint/format), Vitest (Next), Deno test (bot), Sentry |

The Telegram bot talks to the Next app over
`/api/internal/bot/*` (Bearer `BOT_INTERNAL_TOKEN`). Business logic lives in
`lib/bot/*` on the Next side; the bot is a thin HTTP client + Telegram UI.

See `README.md`, `bot/README.md`, and `TODO.md` for milestones and env vars.

## 6. Code Style (Next.js app)

**Follow Biome** (`biome.json`). Run `pnpm lint` before finishing.

- **Block statements:** always use braces for `if`/`else`/`for`/`while`
  (`useBlockStatements`).
- **Quotes & indent:** 2 spaces, double quotes — match the surrounding file.
- **Imports:** use path aliases (`@/lib/…`, `@/components/…`, `@/ui/…`,
  `@/types/…`). Import types from where they are defined (`types/model.ts`,
  `lib/validation.ts`), not from re-exporters.
- **UI:** Chakra primitives from `@chakra-ui/react`; shared wrappers from
  `@/ui/index` (`Button`, `Heading`, `Input`, `Text`, `toast`, …).
- **Client components:** `"use client"` at the top when needed; prefer
  server components for data fetching in `app/`.
- **API routes:** wrap handlers with `errorMiddleware` from `lib/error.ts`;
  throw from the `errors` catalog rather than ad-hoc `Response` objects.
  Validate bodies with Zod schemas from `lib/validation.ts`.
- **Bot internal routes:** use `botRoute` from `lib/bot-api-route.ts`
  (adds `requireBotInternalToken`).
- **Mini App routes:** use `requireTelegramInitData` from
  `lib/tg-api-auth.ts`.
- **Typed client:** browser mutations go through `lib/api.ts`, not raw
  `fetch` in components.
- **Comments:** only for non-obvious business logic; code should read clearly
  on its own.

## 7. Architecture Conventions

**Registration & capacity**

- FSM in `lib/registration.ts`; Postgres advisory lock per event in
  `lib/locks.ts`. Keep these invariants intact when touching sign-up flow.

**Time & templates**

- Template time helpers live in `lib/templates.ts` (Luxon, IANA timezones on
  `Place`). The bot mirrors this in `bot/src/services/time.ts` — if you
  change one side, update the other and its tests.

**Notifications**

- Channel resolution: event → template → place (`lib/notifications/effectiveChannels.ts`).
- Outbound sends are fire-and-forget; never block the user request on them.

**Errors**

- Extend `errors` in `lib/error.ts` for new HTTP error shapes; don't scatter
  status codes across routes.

**Schema changes**

- Edit `prisma/schema.prisma`, add a migration, update seed/fixtures if
  needed. Never hand-edit applied migration SQL unless you know why.

## 8. Telegram Bot (`bot/`)

Separate Deno project; excluded from root `tsconfig.json` and Biome.

- Entry: `bot/src/main.ts` — polling locally, webhook in prod.
- Config: `bot/src/config.ts` — reads `bot/.env` (+ parent `.env` in dev).
- HTTP client: `bot/src/api/*` → `/api/internal/bot/*`.
- Handlers: `bot/src/handlers/*`; Telegram-facing logic in
  `bot/src/services/*`.
- i18n: `bot/messages/{en,ru}.json` + `bot/src/i18n.ts`.

After bot changes:

```bash
cd bot && deno task check && deno task test
```

Shared behavior (time, registration rules) must stay aligned with `lib/`.
When logic can't be shared over HTTP, keep mirrored test suites in sync.

## 9. Verification

Run what your change touches:

| Change | Command |
| --- | --- |
| Next app logic / UI | `pnpm test` |
| API routes (concurrency) | `pnpm test:integration:local` |
| Lint / format | `pnpm lint` |
| Bot | `cd bot && deno task check && deno task test` |
| Schema | `pnpm db:migrate` (dev DB) |

Unit tests (`pnpm test`) need no database. Integration tests spin up Postgres
17 via Docker (`scripts/test-integration.sh`).

Only add tests when they cover real behavior the user cares about — not
trivial assertions.

## 10. Git & Files

- When renaming tracked files, use `git mv` to preserve history.
- Don't commit, push, or open PRs unless the user asks.
- Don't commit secrets (`.env`, tokens). Warn if asked to commit them.

---

**These guidelines are working if:** diffs stay focused, tests pass before
hand-off, and clarifying questions come before implementation rather than
after mistakes.
