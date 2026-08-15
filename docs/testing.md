# Testing

Three layers, run independently. Unit and integration need no browser.
Playwright e2e covers the Web UI.

## Unit tests

```bash
pnpm test           # once
pnpm test:watch     # watch mode
pnpm test:coverage  # v8 coverage
```

No database, no network. Covers pure logic in `lib/` — registration FSM,
error middleware, template time helpers, Telegram link codes, initData
validation, etc.

Mirrored time tests also live in `bot/tests/` (Deno) so Next and bot can't
drift on DST / timezone math.

## Integration tests

Exercise API route handlers against **Postgres 17** (same major as Neon prod).
They cover registration end-to-end, including the advisory-lock invariant under
concurrent `POST /api/events/:id/register` calls.

### Local (Docker)

One-shot — spins up PG 17, runs tests, tears down:

```bash
pnpm test:integration:local
pnpm test:integration:local -t lock   # forward args to vitest
KEEP=1 pnpm test:integration:local    # keep container for iteration
```

Wrapper script: [`scripts/test-integration.sh`](../scripts/test-integration.sh).

### Existing Postgres

```bash
DATABASE_URL='postgresql://user:pass@host:5432/db?schema=public' \
  pnpm test:integration
```

The suite applies all Prisma migrations on startup and truncates every table
between tests.

**Safety:** refuses to run against a `DATABASE_URL` that doesn't look
disposable. Override with `ALLOW_NON_TEST_DB=1` if you know what you're doing.

## Bot tests

```bash
cd bot && deno task check && deno task test
```

Same checks run in CI (`.github/workflows/ci.yml` → `bot` job).

Integration smoke (Next app must be running with matching `BOT_INTERNAL_TOKEN`):

```bash
cd bot
deno run --allow-env --allow-net --allow-read --allow-import \
  --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
```

Manual E2E checklist: [`bot-test-plan.md`](bot-test-plan.md).

## Playwright (Web UI)

Chromium specs in `e2e/`. They sign in through the test/dev password form
(`testuser` / `testuser`, `testadmin` / `testadmin`) against a disposable
Postgres. Production stays Telegram-only: leave `AUTH_PASSWORD_LOGIN` and
`NEXT_PUBLIC_PASSWORD_LOGIN` unset.

`NEXT_PUBLIC_PASSWORD_LOGIN=1` is inlined at **build** time — set it before
`next build` (the e2e runner and CI job do this).

```bash
pnpm exec playwright install chromium   # once
pnpm test:e2e:local                     # Docker PG 17 + Next on :3100
KEEP=1 pnpm test:e2e:local              # keep the container for iteration
```

Wrapper: [`scripts/test-e2e.sh`](../scripts/test-e2e.sh). Same disposable-URL
guard as integration tests; it will not truncate a production database.

Against an existing test Postgres:

```bash
DATABASE_URL='postgresql://budu:budu@localhost:54330/budu_test?schema=public' \
  AUTH_PASSWORD_LOGIN=1 NEXT_PUBLIC_PASSWORD_LOGIN=1 \
  AUTH_SECRET=e2e-secret AUTH_URL=http://127.0.0.1:3100 \
  pnpm test:e2e
```

## CI

Unit, integration, bot, and Playwright jobs run in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml). `pnpm ci` is still
lint + unit tests + build only.
