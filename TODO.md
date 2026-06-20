# EXECUTION PLAN
- [ ] Batumi Podvalchik :)
  - [ ] Telegram bot (grammY on Deno; see plan below)

## Telegram bot — milestones

Stack: Deno 2.x + grammY, same Postgres as the Next app (direct via `postgresjs`),
Deno Deploy (`Deno.cron` + webhook). Supports both Telegram channels and
groups via a per-binding flag. Mini App deferred to M4.

### M0 — Prisma migrations (no behavior change)
- [ ] `EventTemplate`: weekly recurrence (`dayOfWeek`, `localTime`, `timezone`),
      `durationMinutes`, `capacity`, `reserveCapacity`,
      `announceOffsetMinutes`, `enabled`, FK `placeId`.
- [ ] `EventTemplateNotificationChannel` (mirrors place/event channel tables).
- [ ] `Event.templateId String?` + `@@unique([templateId, startAt])` for
      idempotent materialization.
- [ ] `Event.announcements Json?` — `[{ chatId, messageId, lastRenderedAt,
      lastSignature }]` so we can edit the live announcement, not repost.
- [ ] `User.telegramUserId BigInt? @unique` + `telegramUsername String?`.
- [ ] Update `prisma/seed.ts` + integration tests for the new fields.

### M1 — `bot/` Deno project skeleton
- [ ] `bot/deno.jsonc`, `bot/src/main.ts` (grammY webhook server + cron stub).
- [ ] `bot/src/db/client.ts` against the same `DATABASE_URL`.
- [ ] Port `/start`, `/link`, `/unlink` from
      `app/api/webhook/telegram/route.ts`. Keep the Next route behind
      `TELEGRAM_WEBHOOK_OWNER=next|bot` until M1 is stable, then delete.
- [ ] Duplicate `lib/registration.ts` + tests into
      `bot/src/db/registrations.ts` (extract to shared package later if it
      drifts).
- [ ] `bot/README.md` for local dev (ngrok hint, `deno task dev`).

### M2 — Admin templates
- [ ] Web admin UI: `app/admin/places/[id]/templates` (CRUD) — Chakra forms.
- [ ] Bot DM `/templates` — read-only listing of templates the user admins.
- [ ] Cron: materialize `Event` rows from active templates 8 days ahead
      (idempotent on `(templateId, startAt)`).

### M3 — Announcements + user registration
- [ ] Cron posts announcement at `startAt - announceOffsetMinutes` and stores
      `(chatId, messageId)` in `Event.announcements`.
- [ ] Inline keyboard: Register / Waitlist / Cancel / Full list. Signed
      `callback_data` (HMAC) so old messages can't forge state.
- [ ] Capacity FSM under `pg_advisory_xact_lock` per event (mirror
      `lib/locks.ts`).
- [ ] Re-render announcement on change, debounced to ≥5s per event (Telegram
      flood limit ≈1 edit/sec per chat).
- [ ] First-time-user onboarding via deep link `t.me/<bot>?start=ev_<id>`.

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
