# Testing

Two layers, run independently.

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
cd bot && deno task test && deno task check
```

Integration smoke (Next app must be running with matching `BOT_INTERNAL_TOKEN`):

```bash
cd bot
deno run --allow-env --allow-net --allow-read --allow-import \
  --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
```

## CI

Both unit and integration jobs run in
[`.github/workflows/ci.yml`](../.github/workflows/ci.yml).
