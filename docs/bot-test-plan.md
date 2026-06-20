# Telegram bot — manual test plan

End-to-end checklist for the Deno bot (`bot/`). Automated unit/smoke commands
live in [`testing.md`](testing.md#bot-tests); architecture and env vars in
[`telegram.md`](telegram.md) and [`bot/README.md`](../bot/README.md).

Manual E2E testing requires **both apps running** with matching secrets.

---

## Prerequisites

### Environment

| Variable | Where | Must match |
|----------|-------|------------|
| `BOT_INTERNAL_TOKEN` | root `.env` + `bot/.env` | ✓ each other |
| `TELEGRAM_LINK_SECRET` | root `.env` + `bot/.env` | ✓ each other |
| `TELEGRAM_BOT_TOKEN` | root `.env` + `bot/.env` | ✓ each other |
| `TELEGRAM_CALLBACK_SECRET` | `bot/.env` only | — |
| `API_BASE_URL` | `bot/.env` | Next app URL |
| `WEB_APP_BASE_URL` | `bot/.env` (optional) | Public URL for Mini App |

### Start stack

```bash
# Terminal 1 — Next app + DB
pnpm dev

# Terminal 2 — bot (long-polling; drops any webhook)
cd bot && deno task dev
```

Confirm bot logs: `initialized`, `polling as @…`.

### Test accounts / chats

Prepare at least:

- **Super-admin** — web login with `SUPERADMIN` role
- **Place admin** — user added as place admin (for `/new_template`)
- **Regular user** — Telegram account for registration
- **Group or channel** — where announcements will be posted (bot must be admin in channels)

For channel tests: bot needs **Post Messages** and **Edit Messages**.

---

## Layer 1 — Automated (no Telegram)

Run before manual testing:

```bash
cd bot && deno task check && deno task test   # 32 unit tests
pnpm test                                      # shared lib tests (initData, link codes, etc.)
```

Covers: capacity FSM, registration window (24h rule), callback_data HMAC, link
code verify, timezone/DST math, i18n lookups.

### API smoke (Next must be running)

```bash
cd bot
deno run --allow-env --allow-net --allow-read --allow-import \
  --env-file=.env --env-file=../.env scripts/smoke_materialize.ts
```

**Expect:** first pass may insert events; second pass is idempotent
(`inserted: 0`).

---

## Layer 2 — Setup & linking

### 2.1 Link chat to place

1. Log in as super-admin on web → open a place → **Super Admin Console** →
   generate Telegram link code.
2. In Telegram (group or DM): `/link <code>`.
3. **Expect:** success message with place name; `/start` shows chat id.

| Case | Steps | Expect |
|------|-------|--------|
| Missing code | `/link` | Usage hint |
| Bad code | `/link wrong` | Verification error |
| Expired/reused code | use old code | Failure message |
| Wrong secret | mismatch `TELEGRAM_LINK_SECRET` | All codes fail |

### 2.2 Unlink

1. Generate a new link code (unlink uses same code format).
2. `/unlink <code>`.
3. **Expect:** success; `/templates` → not linked; `/announce_next` → not linked.

### 2.3 Not linked commands

In an unlinked chat:

- `/templates` → empty / not linked message
- `/announce_next` → not linked message

---

## Layer 3 — Templates & materialization

### 3.1 Web admin UI

1. `/admin/places/<id>/templates` — create enabled template (e.g. weekly,
   `announceOffsetMinutes: 1440`).
2. Optional: add **Telegram channel override** on template.

### 3.2 Bot wizard (DM only)

1. DM bot as **place admin**: `/new_template`.
2. Walk through: pick place → title → day (1–7) → time `HH:MM` → capacity (or
   `-`).
3. **Expect:** confirmation with title + place.

| Case | Expect |
|------|--------|
| Run in group chat | “DM only” message |
| Non-admin user | “no places” |
| Invalid day/time/capacity | Validation error, wizard stops |
| Send `/cancel` mid-wizard | “Cancelled.” |

### 3.3 `/templates` in linked chat

**Expect:** grouped by place, weekday/time, capacity, next 3 occurrence dates
in local timezone.

### 3.4 Materialization (cron)

1. Wait ~60s (local interval) or trigger smoke script.
2. Check web/DB: upcoming `Event` rows exist for enabled templates.
3. **Expect:** cron log only when something changes; idempotent on repeat ticks.

---

## Layer 4 — Announcements

### 4.1 Manual announce

In linked chat: `/announce_next`.

**Expect:** posts next upcoming event for that place’s linked chat(s); inline
keyboard with register buttons + **📋 List** Mini App button.

| Case | Expect |
|------|--------|
| No upcoming events | “no events” message |
| Chat linked to multiple places | one post per place with a next event |

### 4.2 Scheduled announce

1. Create event/template whose `startAt − announceOffsetMinutes` is in the past
   (or adjust offset for testing).
2. Wait for cron tick (~1 min).
3. **Expect:** announcement appears in resolved channels (place → template →
   event override order).
4. Second tick: **skipped** (idempotent — message already in `Event.announcements`).

### 4.3 Live message updates

1. Post announcement (manual or cron).
2. Register/unregister via inline buttons (see §5).
3. **Expect:** same message **edits in place** after ~5s debounce; participant
   counts/names update.
4. Rapid taps: debounce coalesces edits (no flood errors in bot logs).

### 4.4 Channel permissions

Post to a channel where bot lacks edit rights.

**Expect:** error logged in cron; other channels still work.

---

## Layer 5 — Registration

Registration window: **opens 24h before start**, **closes at start** (same as
web).

### 5.1 Inline buttons (under announcement)

| Action | Setup | Expect |
|--------|-------|--------|
| Register (confirmed) | capacity available, window open | toast “registered”; counts update |
| Waitlist | confirmed full, reserve available | toast “waitlisted” |
| Full | both lists full | toast “full” |
| Cancel | user registered | toast “cancelled”; waitlist may promote |
| Cancel + promote | waitlist exists | toast mentions promotion |
| Already registered | tap again | “already confirmed/waitlist” |
| Window closed | event started or >24h away | “window closed” on deep link hint |

### 5.2 Deep link (DM)

Open: `https://t.me/<bot>?start=ev_<eventId>`

**Expect:** event card + keyboard; hint shows register open/closed based on
window.

| Case | Expect |
|------|--------|
| Invalid event id | “event not found” |
| `/start` without payload | standard help text |

### 5.3 Stale/tampered buttons

Copy old announcement or edit `callback_data` manually (if possible).

**Expect:** “stale button” toast; no DB change.

### 5.4 Cross-check with web

1. Register on bot → refresh web place page → same user on participant list.
2. Register on web → bot announcement edits reflect change.
3. Confirm/reserve counts match on bot message, web UI, and Mini App.

---

## Layer 6 — Mini App (📋 List)

1. Tap **📋 List** on an announcement (requires `WEB_APP_BASE_URL` reachable
   from phone).
2. **Expect:** opens `/tg/events/[id]` inside Telegram; full participant list
   loads.

| Case | Expect |
|------|--------|
| Open outside Telegram | initData missing → auth error |
| Wrong/old initData | 401 |
| Local dev on phone | use tunnel (ngrok etc.) or same-network URL for `WEB_APP_BASE_URL` |

Fallback: **List** callback (non–Web App path) sends full list as DM — test if
Web App unavailable.

---

## Layer 7 — i18n & UX

1. Set Telegram client language to **Russian** → `/help`, `/start`, toasts in
   Russian.
2. Set to **English** → English strings.
3. Type `/` in chat → command menu shows localized descriptions for both
   locales.

Commands to spot-check: `start`, `help`, `link`, `unlink`, `announce_next`,
`templates`, `new_template`.

---

## Layer 8 — Error handling & ops

| Check | How | Expect |
|-------|-----|--------|
| Next app down | stop `pnpm dev`, send `/templates` | Bot logs API error; no crash |
| Bad `BOT_INTERNAL_TOKEN` | wrong token in bot | 401 on internal API; commands fail gracefully |
| Webhook vs polling | local uses polling | no 409 on `getUpdates` |
| Sentry (optional) | set `SENTRY_DSN`, trigger handler error | event in Sentry dashboard |
| Health (webhook mode) | `GET /health` on bot server | `200 ok` |

---

## Layer 9 — Production / webhook (staging)

Before deploy:

1. `BOT_MODE=webhook`, `WEBHOOK_URL`, `WEBHOOK_SECRET` set.
2. `deno task start` — webhook registered log line.
3. Send command in Telegram → update received.
4. Cron runs on host (Deno Deploy cron or interval fallback).
5. Secrets match between Next and bot on staging.
6. `WEB_APP_BASE_URL` is the **public HTTPS** origin (not localhost).

---

## Minimal smoke checklist (~30 min)

Use before a release:

- [ ] `deno task check && deno task test` green
- [ ] `/link` + `/templates` in linked chat
- [ ] `/announce_next` posts with keyboard
- [ ] Register + cancel via inline button; message edits
- [ ] Deep link `?start=ev_<id>` works in DM
- [ ] **📋 List** Mini App opens and shows participants
- [ ] `/new_template` in DM (place admin) creates template
- [ ] Cron materialize + announce (or smoke script)
- [ ] Web registration syncs to bot message
- [ ] ru + en command menu visible

---

## Known limitations (not bugs)

- `/templates` is read-only; CRUD is web-only (`/admin/...`).
- Announcement participant names in message body are Russian-formatted
  regardless of user locale (buttons/toasts are localized).
- Local Mini App needs a URL Telegram can reach (tunnel or deploy).
