# Deploying the budu Telegram bot (Fly.io)

The bot is a **long-running Deno process** (polling or webhook + cron). It does
not use serverless — Fly.io VM or similar is appropriate. The Next.js app can
stay on Vercel; the bot only needs outbound HTTPS to `/api/internal/bot/*`.

Repo includes [`fly.toml`](./fly.toml) and [`Dockerfile`](./Dockerfile). Build
context is the **monorepo root** (includes `packages/api-client`).

---

## What the bot needs at runtime

| Dependency | Why |
| --- | --- |
| Deno 2 | grammY bot + cron |
| Outbound HTTPS | Telegram API + Next.js internal API |
| Secrets | Token, shared HMAC, internal API bearer |

No Postgres, no inbound ports for **polling** mode.

---

## 1. Install CLI & log in

```bash
brew install flyctl   # or: curl -L https://fly.io/install.sh | sh
fly auth login
```

## 2. Create app (first time)

Edit `app = "budu-bot"` in [`fly.toml`](./fly.toml) if you want another name,
then **once**:

```bash
fly apps create budu-bot
```

Deploy token for GitHub Actions (scoped to this app):

```bash
fly tokens create deploy -a budu-bot -x 999999h
```

Copy the full token → GitHub repo → **Settings → Secrets → Actions** →
`FLY_API_TOKEN`.

## 3. Set secrets

Required (must match the Next.js app on Vercel):

```bash
fly secrets set -a budu-bot \
  TELEGRAM_BOT_TOKEN="123456:ABC..." \
  BOT_INTERNAL_TOKEN="..." \
  TELEGRAM_LINK_SECRET="..." \
  API_BASE_URL="https://yabudu.vercel.app" \
  WEB_APP_BASE_URL="https://yabudu.vercel.app"
```

Optional:

```bash
fly secrets set SENTRY_DSN="https://..." -a budu-bot
```

`PORT=8080` is set in `fly.toml`. Do not commit secrets to the repo.

## 4. Deploy

From repo root:

```bash
fly deploy --config bot/fly.toml
fly logs -a budu-bot
```

**GitHub Actions:** push to `main` after CI passes (see
[`.github/workflows/deploy-bot.yml`](../.github/workflows/deploy-bot.yml)).

## 5. Ops

```bash
fly status -a budu-bot
fly ssh console -a budu-bot
fly secrets list -a budu-bot
fly scale count 1 -a budu-bot --yes   # enforce single machine
```

---

## Polling vs webhook on Fly

| Mode | Telegram | Fly `[http_service]` |
| --- | --- | --- |
| **Polling** (default) | Bot pulls updates via `getUpdates` | **Yes** — `/health` on `:8080` keeps the machine alive |
| **Webhook** | Telegram POSTs to `{BOT_PUBLIC_URL}/webhook` | Same port — `/webhook` + `/health` |

Leave `BOT_PUBLIC_URL` unset for polling. For webhook:

```bash
fly secrets set BOT_PUBLIC_URL=https://budu.fly.dev -a budu
```

`[http_service]` uses `auto_stop_machines = "off"` so the bot stays up 24/7.

---

## Sizing & region

- **VM:** 1 shared CPU / 512 MB in `fly.toml` (enough for grammY + cron).
- **Single machine:** deploy workflow runs `fly scale count 1`.
- **Region:** default `fra` — change `primary_region` in `fly.toml` before first
  deploy (e.g. `iad`, `ams`).

---

## Env checklist (production)

```env
TELEGRAM_BOT_TOKEN=...
BOT_INTERNAL_TOKEN=...      # same as Vercel
TELEGRAM_LINK_SECRET=...    # same as Vercel
API_BASE_URL=https://...    # Vercel / future Fly web URL
WEB_APP_BASE_URL=https://... # public URL for Mini App buttons
# BOT_PUBLIC_URL=          # unset = polling
# SENTRY_DSN=              # optional
```

---

## Local Docker smoke (optional)

From repo root:

```bash
docker build -f bot/Dockerfile -t budu-bot .
docker run --rm --env-file bot/.env budu-bot
```

Use `API_BASE_URL=http://host.docker.internal:3000` on macOS if Next runs on
the host.
