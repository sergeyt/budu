# Plan: Link Telegram identity to Budu `User`

Status: **P1 implemented** (no web UI; unlink is P2).

## Goal

Attach a Telegram identity (`telegramUserId`, username, first name) to an
existing Budu `User` (OAuth / SUPERADMIN / PlaceAdmin) so bot admin features and
registrations resolve to the same account.

Today the bot only calls `findOrCreateTelegramUser`, which upserts a separate
bot-only row (`tg_…`) keyed by Telegram id. There is no flow that merges that
identity onto a web account. Schema comment on `User.telegramUserId` already
anticipates this; the product path is missing.

Related: [`superadmin-bot-guide.md`](superadmin-bot-guide.md),
[`telegram.md`](telegram.md), [`bot-test-plan.md`](bot-test-plan.md).

---

## Non-goals

- Auto-link via Mini App `initData` alone (no proof of web session).
- Changing legacy Next `app/api/webhook/telegram` (still place-chat `/link`
  only; primary path remains the Deno bot).
- Silently merging two OAuth users that both have email/accounts.
- Replacing place chat linking (`/link <code>` for places).
- **Web UI for linking** — no “Link Telegram” button or profile control in P1–P2.
  Code generation is API-only (browser console / `curl` with session cookie).

---

## Recommended UX

**Session API → bot claims** (mirrors place Telegram link codes; no web UI).

1. Signed-in user generates a code via `POST /api/me/telegram-link` (session
   cookie; e.g. browser console on the site, or `curl`).
2. Server returns a short-lived HMAC code (reuse `TELEGRAM_LINK_SECRET`).
3. User DMs the bot: `/link_account <code>` (name TBD; must stay distinct from
   place `/link`).
4. Bot calls an internal API that verifies the code and attaches the Telegram
   id to that Budu `userId`.
5. Bot replies linked / already linked / error.

### Why this approach

| Option | Pros | Cons |
| --- | --- | --- |
| **HMAC code (chosen)** | Matches place `/link`; works with polling or bot webhook; no new Telegram product setup | User must copy a code |
| Telegram Login Widget | Familiar “Log in with Telegram” | Extra domain/widget setup; different auth path |
| Mini App + session cookie | Nice later | Needs logged-in browser inside TG; easy to get wrong |
| “Webhook auto-link” | Sounds automatic | Webhook alone cannot prove which web user to attach |

Polling vs webhook does not matter: the Deno bot handler is the same.

---

## Open decisions (review)

1. **Command name:** `/link_account` (clear) vs `/connect` (shorter)?
2. **Who can link:** any signed-in user (**recommended** — PlaceAdmins need it)
   vs SUPERADMIN-only for v1?
3. **One-time codes:** accept until TTL only, or consume (DB/nonce) on first
   success?
4. **Unlink in P1 or P2?**

Suggested defaults if no objections: `/link_account`, any signed-in user, TTL
only (15 min), unlink in P2.

---

## Merge rules

| Situation | Behavior |
| --- | --- |
| Target user has no `telegramUserId` | Set id + profile fields |
| Target already has **same** Telegram id | Idempotent success; refresh username / first name |
| Target has a **different** Telegram id | Reject (require unlink first) |
| Orphan `tg_…` user owns that Telegram id | **Merge**: reassign registrations / `PlaceAdmin` to target; clear orphan’s `telegramUserId`; delete orphan if nothing else remains; then set on target |
| Telegram id already on another “real” OAuth user (email / `Account` rows) | Reject — resolve manually |

Unlink (P2): `DELETE /api/me/telegram-link` and/or bot command — clear
`telegramUserId` / username / firstName on the Budu user; do not delete the
user. Still no web UI.

---

## Implementation sketch

### 1. Link codes

Extend [`lib/telegramLinkCode.ts`](../lib/telegramLinkCode.ts) (or a sibling
module) with user-link helpers:

- Payload: `{ kind: "user", userId, exp }` (or separate encode/verify functions
  so place codes cannot be reused as user codes).
- Same secret: `TELEGRAM_LINK_SECRET`.
- TTL: ~15 minutes (match place codes).

Mirror tests in `test/lib/telegramLinkCode.test.ts` and bot-side if duplicated.

### 2. Next.js — session API (no UI)

- `POST /api/me/telegram-link` (auth required) → `{ code, instructions }`.
- Document console/`curl` usage in docs (developers / super-admins).
- Optional in P2: `DELETE /api/me/telegram-link` to unlink.
- Do **not** add a web component or mount point for this.

### 3. Next.js — bot internal API

- `POST /api/internal/bot/users/link`  
  Body: `{ telegramUserId, username?, firstName?, code }`  
  Auth: existing `botRoute` / `BOT_INTERNAL_TOKEN`.
- Business logic in [`lib/bot/users.ts`](../lib/bot/users.ts) (merge rules
  above), with clear error codes in [`lib/error.ts`](../lib/error.ts).

### 4. Deno bot

- Handler for `/link_account` (en/ru i18n in `bot/messages/`).
- Call internal link API; do not change place `/link` / `/unlink`.
- After success, admin lookups via `telegramUserId` hit the real account
  ([`lib/bot/admin.ts`](../lib/bot/admin.ts)).

### 5. Existing `findOrCreateTelegramUser`

Leave as-is for pure bot users. After a successful link, the unique
`telegramUserId` lives on the web user, so subsequent upserts update that row
instead of creating a new orphan.

### 6. Schema

No migration required if we keep existing `User.telegram*` columns. Optional
later: `telegramLinkedAt DateTime?`.

### 7. Docs

- Update [`superadmin-bot-guide.md`](superadmin-bot-guide.md) (replace manual
  SQL with API + `/link_account` flow; include console snippet).
- Short note in [`telegram.md`](telegram.md).
- Add a row to the smoke checklist in [`bot-test-plan.md`](bot-test-plan.md).

---

## Phases

| Phase | Deliverable |
| --- | --- |
| **P1** | Codes + session “generate code” API + internal link + merge orphan + bot `/link_account` + tests + docs (no web UI) |
| **P2** | Unlink via session API and/or bot command (still no web UI) |
| **P3** (optional) | Web or Mini App UI — only if we later want a non-API entry point |

---

## Test plan (P1)

- Unit: create/verify user link code; expired / bad sig / place code rejected.
- Unit: attach to clean user; idempotent re-link; reject different id; merge
  orphan with a registration; reject conflict with another OAuth user.
- Bot: `/link_account` success and failure messages (i18n keys present).
- Manual: SUPERADMIN links → DM `/new_template` lists places; registration
  from bot and web share the same `User.id`.

---

## Success criteria

- After link, DM `/new_template` sees places for that user’s SUPERADMIN /
  PlaceAdmin role.
- Bot registrations for that Telegram id use the same `User.id` as the web
  account.
- Place `/link` behavior unchanged.
- Orphan `tg_…` rows with history do not block linking.

---

## Rough file touch list (P1)

| Area | Files (expected) |
| --- | --- |
| Codes | `lib/telegramLinkCode.ts`, tests |
| Users / merge | `lib/bot/users.ts`, `lib/error.ts` |
| Routes | `app/api/me/telegram-link/route.ts`, `app/api/internal/bot/users/link/route.ts` |
| API client (optional) | `packages/api-client` bot/web helpers if useful for tests |
| Bot | `bot/src/handlers/*`, `bot/src/bot.ts`, `bot/messages/{en,ru}.json` |
| Docs | this plan’s related guides (console/`curl` examples) |

---

## Review checklist

- [x] Command name: `/link_account`
- [x] Who can link: any signed-in user (`POST /api/me/telegram-link`)
- [x] TTL-only (15 min), not one-time consume
- [x] Unlink deferred to P2
- [x] P1 implemented
