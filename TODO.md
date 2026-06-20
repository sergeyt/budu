# Roadmap

Event registration for table-tennis clubs — web app + Telegram bot. Stack and
setup: [`README.md`](./README.md).

## Shipped

**Web** — OAuth (Yandex, VK, Sber, TBank), place picker, register/unregister
with waitlist + auto-promotion, `/admin` template CRUD, next-intl (ru),
theme switch, place info drawer.

**Telegram bot (M0–M4)** — Deno + grammY via `/api/internal/bot/*`; weekly
template materialization, scheduled announcements, inline registration,
Mini App participant list, `/new_template` wizard, per-template channels,
ru/en bot strings, optional Sentry. Details: [`docs/telegram.md`](./docs/telegram.md).

**Quality** — Vitest unit tests, Postgres 17 integration tests in CI,
Biome, mirrored bot time tests, docs (`docs/`, `AGENTS.md`, `CODEREVIEW.md`).

---

## Next improvements

Prioritized backlog. Pick up in order unless a specific item is more urgent.

### UX & product

- [ ] **Capacity on event card** — badge or tooltip:
  `registered / capacity / waitlist` (players often already know cap numbers)
- [ ] **Language switcher** — en/ru toggle (next-intl wired; UI switch missing)
- [ ] **Waitlist clarity on web** — show RESERVED status after sign-up; confirm
  full flow in browser (logic + integration tests exist; manual pass still open)

### Admin & super-admin

- [ ] **Event time selector** — easier ad-hoc event editing (super-admin)
- [ ] **Place admin management** — assign/remove admins in UI (not only DB/seed)
- [ ] **Delete legacy Next Telegram webhook** — `app/api/webhook/telegram` if
  fully replaced by Deno bot; drop `TELEGRAM_WEBHOOK_OWNER` split

### Notifications

- [ ] **MAX Messenger** — finish transport + test on a real chat
  (`lib/notifications/transports/max.ts` is placeholder)
- [ ] **Registration push to channels** — verify Telegram + MAX list updates
  after web sign-up match announcement edits

### Dev tooling

- [ ] **DB scripts** — delete old events, generate fake users, bulk-add
  registrations (for demos and load checks)
- [ ] **Bot in CI** — `deno task check && deno task test` job alongside Next

### Code quality

- [ ] **Typed errors** — use `HttpError` / `errors.*` consistently; reduce
  raw `throw new Error` in new code

### Auth (later)

- [ ] Sign-up by email or phone
- [ ] Sign-in by email or phone

### Infrastructure (later)

- [ ] Plan Neon PG 17 → 18 (new project + pg_dump/restore; no in-place major
  upgrade on Neon)

---

## Manual QA checklist

Quick passes before a release or after big registration/bot changes:

- [x] Yandex sign-in
- [x] Register / unregister (confirmed)
- [ ] Waitlist + promotion (web UI — tap through, not only API tests)
- [ ] Bot: register, waitlist, cancel from announcement + deep link
- [ ] Mini App list from **📋 List** button

---

## Telegram bot milestones (archive)

All complete. Kept for reference.

<details>
<summary>M0–M4 checklist</summary>

**M0 — Schema** — `EventTemplate`, template channels, `Event.templateId`,
`Event.announcements`, `User.telegramUserId`.

**M1 — Bot skeleton** — `bot/`, `/start` `/link` `/unlink`, internal API
refactor (bot no longer uses direct Postgres).

**M2 — Templates** — `/admin` CRUD, `/templates`, materializer cron, shared
time helpers + DST tests.

**M3 — Announcements** — inline keyboard, capacity FSM + advisory lock,
24h registration window, debounced live edits, deep links.

**M4 — Polish** — Mini App, `/new_template` wizard, template channel
overrides, bot ru/en i18n, Sentry-Deno.

**Open ops notes**

- Bot needs **Post Messages** + **Edit Messages** in target channels.
- Times: IANA `Place.timezone` + template `localTime` → UTC `Event.startAt`.

</details>
