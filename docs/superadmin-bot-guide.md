# Super-admin guide: place, templates, and Telegram bot

Short production checklist for the main developer: create a place, manage
event templates, link Telegram, announce, and smoke-test registration.

Full E2E matrix: [`bot-test-plan.md`](bot-test-plan.md). Deploy: [`bot/DEPLOY.md`](../bot/DEPLOY.md).

---

## Prerequisites

- Web login with `User.role = SUPERADMIN`
- Bot running against prod (`API_BASE_URL` / `WEB_APP_BASE_URL` = your Vercel URL)
- Matching secrets on Vercel and `bot/.env`: `BOT_INTERNAL_TOKEN`,
  `TELEGRAM_LINK_SECRET`, `TELEGRAM_BOT_TOKEN`
- Bot added to your test group/channel (for channels: admin with **Post** +
  **Edit** messages)

---

## 1. Become SUPERADMIN (once)

Sign in on the web once, then in Postgres:

```sql
UPDATE "User" SET role = 'SUPERADMIN' WHERE email = 'you@example.com';
```

Sign out and back in so the session picks up the role.

---

## 2. Link your Telegram to the web account

Needed so bot admin commands (`/new_template`, etc.) see your SUPERADMIN /
PlaceAdmin role.

1. Open a place page → **Super Admin Console** → **Link Telegram Account**
   (or `POST /api/me/telegram-link` while signed in).
2. DM the bot: `/link_account <code>` (15 min TTL).
3. Expect success with your user id. Re-run is idempotent if already linked to
   the same Telegram account.

If you previously used the bot, an orphan `tg_…` row may be merged into your
web user automatically.

---

## 3. Create a place

There is no create-place UI yet. SUPERADMIN only: `POST /api/places`.

In the browser console on the site (session cookies apply):

```js
await fetch("/api/places", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ name: "Test Club", location: "Moscow" }),
}).then((r) => r.json());
```

Optional fields: `description`, `infoUrl`. Timezone defaults to
`Europe/Moscow`.

Note the returned `id`.

---

## 4. Manage templates (web)

1. Open `/admin` → click your place, **or** go to
   `/admin/places/<placeId>/templates`
2. Create a weekly template: title, day, time (`HH:MM`), capacity, announce
   offset (default `1440` = 24h before start)
3. Leave it **enabled**

Cron (~1 min) materializes upcoming `Event` rows from enabled templates.

Alternative: DM the bot as SUPERADMIN and run `/new_template` (wizard; DM only).

---

## 5. Link Telegram chat to the place

1. Open `/?place=<placeId>`
2. **Super Admin Console** → **Link Telegram Chat** → copy the code (15 min TTL)
3. In the group/channel (or a DM): `/link <code>`
4. Check: `/templates` lists the place’s templates

Unlink later: generate a fresh code → `/unlink <code>`.

---

## 6. Announce and smoke-test

In the linked chat:

```text
/announce_next
```

Expect a post with register buttons and **📋 List**.

| Check | Expect |
| --- | --- |
| Tap register / cancel | Toast OK; counts update on the message |
| **📋 List** on phone | Mini App opens on prod; lists load |
| Web `/?place=<placeId>` | Same event counts as the announcement |

Optional: wait for cron to announce when `startAt − announceOffsetMinutes` is
reached (instead of `/announce_next`).

---

## Handy map

| Goal | Where |
| --- | --- |
| Create place | `/admin/places/new` |
| Delete place | `/admin` → **Delete** |
| Link Telegram **user** | `/?place=<id>` → **Link Telegram Account** → DM `/link_account` |
| Templates | `/admin/places/<id>/templates` |
| Link **chat** code | `/?place=<id>` → **Link Telegram Chat** |
| Link chat | `/link <code>` in Telegram |
| List templates | `/templates` in linked chat |
| Post next event | `/announce_next` |
| Template wizard | DM `/new_template` |

---

## If something fails

| Symptom | Likely cause |
| --- | --- |
| Bot silent | Bad/revoked `TELEGRAM_BOT_TOKEN`; container not running |
| Cron / commands `BOT_API_NOT_CONFIGURED` | Missing `BOT_INTERNAL_TOKEN` on Vercel |
| Cron / commands `BAD_BOT_INTERNAL_TOKEN` | Token mismatch between Vercel and `bot/.env` |
| `/link` always fails | `TELEGRAM_LINK_SECRET` mismatch |
| Mini App blank | Wrong `WEB_APP_BASE_URL` (must be public HTTPS prod) |
| Channel post fails | Bot missing admin / edit rights |
