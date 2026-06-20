# Code Review Guide

Review **budu** changes for practical bugs and production risk — not
style-only nits. The repo has two runtimes: the Next.js app (web + API +
Prisma) and the Deno Telegram bot (`bot/`).

Focus on what can break registration, announcements, or auth — **and** on
anything that makes sign-up, admin, or Telegram flows harder than they need
to be. UX findings are welcome; call out concrete flow improvements, not
vague "could be nicer" notes. Prefer a small number of high-value findings
over a long checklist.

## Priorities

Review in this order:

1. Correctness and domain invariants (registration, capacity, time)
2. API boundaries, auth, and data integrity (Prisma, locks, tokens)
3. **User experience and flows** — friction, confusion, dead ends, missing feedback
4. React / Next.js behavior (server vs client, async UI)
5. Bot ↔ Next split (logic in the right layer, no drift)
6. TypeScript correctness
7. Performance and resource usage
8. Maintainability and test coverage

Do not add praise or generic comments.

## Project assumptions

Unless the diff clearly shows otherwise, assume:

| Area | Stack |
| --- | --- |
| Web | Next.js 16 App Router, React 19, TypeScript, Chakra UI v3 |
| Data | Prisma 7 + Postgres; schema in `prisma/schema.prisma` |
| Auth | NextAuth v5 (DB sessions); place admins via `PlaceAdmin` |
| Bot | Deno 2 + grammY — **no direct DB**; calls `/api/internal/bot/*` |
| Validation | Zod in `lib/validation.ts`; errors via `lib/error.ts` |
| Tests | Vitest (unit, DB-free); integration tests on Postgres 17 |
| Lint | Biome (`pnpm lint`); bot uses `deno lint` separately |

Business logic for the bot lives in `lib/bot/*` on the Next side. The bot
is Telegram I/O + an HTTP client.

## What to check

### 1. Correctness & domain invariants

This is the highest-value area for budu.

Look for:

- **Registration FSM** (`lib/registration.ts`) — wrong transitions between
  CONFIRMED / RESERVED / unregistered; capacity or reserveCapacity ignored
  or misread (`null`/`undefined` means unlimited).
- **Waitlist promotion** — cancel/unregister must promote the next RESERVED
  user when a confirmed slot opens; order should follow `createdAt`.
- **Registration window** — web and bot must agree on the 24h-before-start
  rule (`lib/registration.ts` / `bot/src/services/registrationWindow.ts`).
- **Advisory locks** (`lib/locks.ts`) — concurrent register/unregister on
  the same event must run under `pg_advisory_xact_lock`; missing lock or
  lock key collision across events.
- **Idempotency** — double-tap register, materialize
  `(templateId, startAt)`, announcement post per channel, callback retries.
- **Edge cases** — zero capacity, full event + full waitlist, event in the
  past, disabled templates, missing place timezone.
- **Broken conditionals** — wrong `null` vs `0` vs `undefined` for optional
  capacity fields.

### 2. API, auth, and Prisma

Look for:

- Routes that skip **`errorMiddleware`** or throw raw `Response` instead of
  `errors.*` from `lib/error.ts`.
- Request bodies parsed without **Zod** (`lib/validation.ts`) or with partial
  validation.
- **Session auth** missing on user-facing routes (`requireUser`,
  `isPlaceAdmin`, `isSuperAdmin` from `lib/api-auth.ts`).
- **Bot internal routes** missing `botRoute` / `requireBotInternalToken`.
- **Mini App routes** missing `requireTelegramInitData` or accepting stale
  `initData` (`lib/telegramInitData.ts`).
- **Prisma queries** that race under concurrency — register/unregister should
  use transactions + advisory lock, not read-then-write without protection.
- **`Event.startAt`** stored as `TIMESTAMP WITHOUT TIME ZONE` — treating it
  as local wall time vs UTC incorrectly (especially bot materialization and
  announce scheduling).
- **`BigInt`** for `User.telegramUserId` — JSON serialization surprises,
  comparing as number when ID exceeds `Number.MAX_SAFE_INTEGER`.
- **Cascade / SetNull** behavior on template delete vs event history.
- Notifications **blocking** the user request — sends must stay fire-and-forget
  (`lib/notifications/notify.ts`).

### 3. User experience and flows

**UX matters a lot in this project.** Actively look for ways to shorten or
clarify real user journeys — not pixel-perfect polish.

**Web app (players & admins)**

- **Registration flow** — is it obvious how to sign in, pick a place, and
  register? Can users tell confirmed vs waitlist status after tapping?
- **Feedback on action** — loading/disabled state while register/unregister
  runs; toast or inline confirmation on success/failure; no silent failures.
- **Capacity clarity** — can users see how full an event is (seats left,
  waitlist position) before committing? Tooltips/badges where counts help.
- **Window messaging** — when registration is closed (24h rule), is the
  reason and *when it opens* shown in plain language, not a generic error?
- **Empty & error states** — no upcoming event, no places, not signed in:
  each should say what to do next, not just "not found".
- **Admin flows** (`app/admin/**`, `TemplateAdmin.tsx`) — create/edit/delete
  templates: validation errors near the field, confirm destructive actions,
  sensible defaults (day, time, announce offset).
- **Place context** — name, timezone, and location visible where admins
  configure templates or events.
- **i18n** — ru copy consistent and natural in `messages/`; mixed EN/RU in
  one screen without reason.

**Telegram bot**

- **Onboarding** — `/start`, `/help`, `/link`: can a new admin or player
  figure out the next step without reading source code?
- **Deep links** (`/start ev_<id>`) — event title, time (place timezone),
  and register hint visible; buttons match current registration state.
- **Callback toasts** — `answerCallbackQuery` text explains outcome (full,
  waitlisted, window closed, already registered); not cryptic or empty.
- **Dead ends** — e.g. list DM fails → tell user to message bot `/start`;
  wizard cancelled mid-flow → clear exit, not a hung conversation.
- **Mini App** (`/tg/events/[id]`) — loading/error states; participant names
  readable; works when opened from channel vs DM.
- **Announcements** — keyboard labels match locale; **📋 List** WebApp opens
  the right URL; live message updates don't flash or drop buttons.

**Cross-surface consistency**

- Same rules, same words — registration window, capacity, and status labels
  should align between web, bot toasts, and Mini App.
- Time always shown in **place local time** (or labeled if not), especially
  in Telegram text where users expect venue time.

Flag UX issues as **Medium** when they confuse users or block a common path;
**Low** for small clarity wins. **High** only if users literally cannot
complete register, link a chat, or manage templates.

### 4. React and Next.js

Be strict about:

- **Server vs client** — unnecessary `"use client"`; secrets or Prisma in
  client components; fetching in client that belongs in a server component.
- **Auth-gated UI** — admin pages must redirect or 403 when session/role is
  missing (see `app/admin/**`).
- **`useEffect` dependency arrays** — stale closures, missing deps, effects
  that fire on every render.
- **Missing cleanup** — timers (announce debounce mirrors), subscriptions,
  `setState` after unmount in client components (e.g. Mini App fetch in
  `components/TgEventPage.tsx`).
- **Mutations** — prefer `useTransition` + `router.refresh()` (existing
  pattern in `TemplateAdmin.tsx`) over manual cache hacks.
- **Derived state** stored in `useState` when it can be computed from props.
- **List keys** — stable keys, not array index, for participant/template lists.
- **next-intl** — user-visible strings in the web app should go through
  `messages/`, not hardcoded English/Russian in components (bot strings go
  in `bot/messages/`).

### 5. Bot ↔ Next split

When the diff touches `bot/` or `lib/bot/`:

- Business rules added only in the bot that should live in **`lib/bot/*`**
  (Prisma, locks, FSM).
- **Duplicated logic** between `lib/templates.ts` and
  `bot/src/services/time.ts` — if one side changes, the other and its tests
  must too.
- Bot code importing Prisma or `DATABASE_URL` — not allowed.
- **HMAC callback data** (`bot/src/services/callbackData.ts`) — tampered or
  expired buttons handled safely; `list` fallback for old messages vs
  `web_app` for new ones.
- **Announce edit debounce** (`scheduleAnnouncementRefresh`) — coalescing
  broken or editing too fast for Telegram flood limits.
- **Cron tick** — materialize + announce errors swallowed without logging;
  partial failure leaving inconsistent `Event.announcements` JSON.
- **i18n** — user-facing bot text hardcoded instead of `tr(ctx, …)` /
  `bot/messages/*.json`.

### 6. Time, templates, and notifications

Look for:

- **IANA timezone** on `Place` — hardcoded offsets, `Date` math without
  Luxon/`lib/templates.ts` helpers.
- **DST transitions** — weekly template materialization around spring/fall
  clock changes; `dayOfWeek` + `localTime` → UTC `startAt`.
- **`announceOffsetMinutes`** — off-by-one on boundary; `0` vs default 1440.
- **Channel precedence** — event > template > place
  (`lib/notifications/effectiveChannels.ts`); override accidentally ignored.
- **Telegram Mini App URL** — `WEB_APP_BASE_URL` vs `API_BASE_URL` mismatch
  in prod.

### 7. TypeScript

Look for:

- `as` casts on Prisma/API JSON (`Event.announcements`, channel `meta`)
  without validation.
- Types imported from the wrong module — use `types/model.ts`,
  `lib/bot/types.ts`, `lib/validation` inferred types, not page re-exports.
- **`any`** hiding real errors in API handlers or bot HTTP client.
- Optional fields confused with required (`Opt<T>`, `null` vs `undefined` in
  Zod `.nullish()` vs `.optional()`).

### 8. Performance

Usually lower priority unless the diff introduces obvious cost:

- N+1 Prisma queries in list endpoints.
- Unbounded participant fetches without pagination where lists can grow large.
- Heavy Luxon/format work on every render.
- Bot cron scanning all events every tick without indexed filters.

### 9. Maintainability

Look for:

- Large route handlers mixing auth, validation, Prisma, and response shaping —
  extract to `lib/` or `lib/bot/` when reused.
- Duplicating registration or template logic instead of calling existing
  helpers.
- Magic numbers (24h window, 8-day materialize horizon, debounce ms) without
  a named constant when reused.
- New env vars not documented in `.env.example`, `README.md`, or `bot/README.md`.

### 10. Tests

If tests are present, check whether they cover:

- FSM edge cases (full, waitlist, promote, unlimited capacity).
- Invalid Zod payloads and auth failures (401/403).
- Time/DST cases if `lib/templates.ts` or `bot/src/services/time.ts` changed.
- Integration tests for concurrent register if locks or registration routes
  changed.

If tests are missing, suggest only the **highest-value** ones — not boilerplate.

## Output format

For each issue:

```md
## [Severity] Short title

- **Area:** correctness | api | ux | react | prisma | bot | timezone | auth | typescript | maintainability | tests
- **Problem:** what is wrong
- **Why it matters:** user-visible or production impact in 1–2 lines
- **Suggested fix:** concrete change
- **Confidence:** high | medium | low
```

## Severity guide

- **High** — wrong registration/capacity, data corruption, auth bypass, broken
  announcements, race under concurrency, or a flow users cannot complete
- **Medium** — important bug, invariant drift, or **UX friction on a common
  path** (confusing errors, missing feedback, dead ends) worth fixing before merge
- **Low** — cleanup, small clarity win, or missing test on a low-risk path

Do not inflate severity.

## Review rules

- Be specific and evidence-based — cite file/behavior, not general React advice.
- Prefer concrete fixes over “consider refactoring”.
- **Suggest UX improvements** when you see a simpler path, clearer copy, or
  missing loading/error/empty state — tie each suggestion to a user action.
- Skip Biome/formatting nits unless they hide a real bug.
- Do not suggest large rewrites unless the diff already goes there.
- **Do review auth/token/initData issues** — they are in scope for this project.
- Flag secrets or tokens committed to the repo as **High**.

## Writing style

Write like a teammate, not a formal audit.

- Be direct and short.
- State what's wrong, why it matters, then the fix.
- Minimal code snippets when they clarify the fix.

## Final summary

End with:

```md
### Summary

- High: X
- Medium: X
- Low: X

### Top priorities

1. ...
2. ...
3. ...

### UX opportunities

Optional — list 1–3 concrete flow improvements spotted in the diff (even if
non-blocking). Skip if none.
```
