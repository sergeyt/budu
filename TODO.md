# EXECUTION PLAN
- [ ] Batumi Podvalchik :)
  - [ ] Telegram bot (grammY on Deno; see plan below)

## Telegram bot — milestones

Stack: Deno 2.x + grammY, same Postgres as the Next app (direct via `postgresjs`),
Deno Deploy (`Deno.cron` + webhook). Supports both Telegram channels and
groups via a per-binding flag. Mini App deferred to M4.

### M0 — Prisma migrations (no behavior change) ✅
- [x] `EventTemplate`: weekly recurrence (`dayOfWeek`, `localTime`),
      `durationMinutes`, `capacity`, `reserveCapacity`,
      `announceOffsetMinutes`, `enabled`, FK `placeId`. Timezone moved to
      `Place` so all templates at one venue share it.
- [x] `EventTemplateNotificationChannel` (mirrors place/event channel tables).
- [x] `Event.templateId String?` + `@@unique([templateId, startAt])` for
      idempotent materialization.
- [x] `Event.announcements Json?` — `[{ chatId, messageId, lastRenderedAt,
      lastSignature }]` so we can edit the live announcement, not repost.
- [x] `User.telegramUserId BigInt? @unique` + `telegramUsername String?`.
- [x] Update `prisma/seed.ts` + integration tests for the new fields.

### M1 — `bot/` Deno project skeleton ✅
- [x] `bot/deno.jsonc`, `bot/src/main.ts` (grammY webhook server + cron stub).
- [x] `bot/src/db/client.ts` against the same `DATABASE_URL`.
- [x] Port `/start`, `/link`, `/unlink` from
      `app/api/webhook/telegram/route.ts`. Keep the Next route behind
      `TELEGRAM_WEBHOOK_OWNER=next|bot` until M1 is stable, then delete.
- [x] Duplicate `lib/registration.ts` + tests into
      `bot/src/db/registrations.ts` (extract to shared package later if it
      drifts).
- [x] `bot/README.md` for local dev (ngrok hint, `deno task dev`).

### M2 — Admin templates ✅
- [x] Web admin UI: `app/admin/places/[id]/templates` (CRUD) — Chakra forms.
      Also adds `/admin` landing that lists the places the signed-in user
      can manage.
- [x] Bot DM `/templates` — read-only listing of templates the chat is
      linked to, with the next 3 occurrences per template.
- [x] Cron: materialize `Event` rows from active templates 8 days ahead
      (idempotent on `(templateId, startAt)`). Uses `Deno.cron` on Deno
      Deploy and `setInterval` locally.
- [x] Shared time helpers (`lib/templates.ts` + `bot/src/services/time.ts`)
      with mirrored Vitest/Deno.test suites that pin DST behavior so the
      two runtimes can't drift.
- [x] postgresjs/Prisma TIMESTAMP round-trip fix (`bot/src/db/client.ts`):
      parse bare TIMESTAMP as UTC so the bot reads what Prisma wrote, and
      vice versa. Verified end-to-end against the dev DB.

### M3 — Announcements + user registration ✅
- [x] Cron posts announcement at `startAt - announceOffsetMinutes` and stores
      `(chatId, messageId)` in `Event.announcements`. Combined tick also runs
      the M2 materializer. Idempotent per channel via `announcements` JSON.
- [x] Inline keyboard: Register / Waitlist / Cancel / Full list. Signed
      `callback_data` (HMAC) — actions `reg`, `wai`, `can`, `list`.
- [x] Capacity FSM under `pg_advisory_xact_lock` per event (mirror
      `lib/locks.ts`). Registration window enforced (24h before → start).
- [x] Re-render announcement on change, debounced ≥5s per event with trailing
      coalescing via `scheduleAnnouncementRefresh`.
- [x] First-time-user onboarding via deep link `t.me/<bot>?start=ev_<id>`.
      Full list DMs the tapper; Mini App deferred to M4.

### M4 — Polish
- [ ] Telegram Mini App for "Full list" (Next.js page, `initData` auth).
- [ ] Bot DM template wizard (`grammy-conversations`).
- [ ] Per-template channel overrides (`EventTemplateNotificationChannel`).
- [ ] ru/en i18n in bot text (mirror `messages/`).
- [ ] Sentry-Deno integration.

### Open notes
- Channel posting requires bot to be added as channel admin with
  **Post Messages** + **Edit Messages** rights — document in onboarding text.
- Time zones: templates store IANA `timezone` + `localTime`; materialization
  converts to UTC `startAt`. Deno side will use `Temporal` (or
  `date-fns-tz` via `npm:`).

# DOCS
- [ ] improve readme:
  - [ ] include all used tools, Sentry is missing

# TESTING
- [x] yandex sign-in
- [x] register/unregister
- [ ] waitlist

# BUGS & IMPROVEMENTS
- [x] hide Place selector if not logged in
- [x] use SVG icons for sign-in providers
- [x] super-admin functions:
  - [x] reuse event for current date (dagomys case)
  - [ ] time selector
  - [ ] select place admins
- [ ] db scripts
  - [x] seed script
  - [ ] delete events, better event names?
  - [ ] script to generate fake users
  - [ ] script to add registrations to event for fake users
- [ ] database / postgres
  - [ ] CI integration tests on `postgres:17` (match Neon prod major)
  - [ ] plan PG 17 → 18 migration on Neon (new project + pg_dump/restore; Neon does not do in-place major upgrades)
- [x] hide sign-in providers if env variables are empty
- [ ] better design & theme
  - [x] theme switch
  - [x] render card
  - [x] place info drawer (including name, description and location URL)
  - [x] better place selector preferably with async search
  - [ ] show capacity info in tooltip since usually people already know it. or as a small badge with 3 numbers. registered/capacity/waitlist
- [x] refactorings:
  - [x] extract model types and reuse in code, never ending :)
  - [ ] use typed errors more

# NEW FEATURES
- [x] internationalization
  - [x] basic next-intl integration
  - [x] ru translations
  - [ ] switch between lang
- [ ] notification about event registrations
  - [ ] send list to MAX chat 
  - [ ] complete MAX notification on testing chat
- [ ] sign-up by email & phone number 
- [ ] sign-in by email or phone number
