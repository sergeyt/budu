# Deploying the budu Telegram bot

The bot is a **long-running Deno process** (polling or webhook + cron). It does
not use serverless. The Next.js app can stay on Vercel; the bot only needs
outbound HTTPS to `/api/internal/bot/*`.

Recommended: Docker Compose on a small VPS (Hetzner, Oracle, etc.). Repo
includes [`Dockerfile`](./Dockerfile) and root
[`docker-compose.yml`](../docker-compose.yml). Build context is the **monorepo
root** (includes `packages/api-client`).

---

## What the bot needs at runtime

| Dependency | Why |
| --- | --- |
| Deno 2 | grammY bot + cron |
| Outbound HTTPS | Telegram API + Next.js internal API |
| Secrets | Token, shared HMAC, internal API bearer |

No Postgres. Polling mode needs **no inbound ports**.

---

## Env checklist (production)

Configure `bot/.env` (from [`.env.example`](./.env.example)). Values must match
the Next.js app on Vercel where shared:

```env
TELEGRAM_BOT_TOKEN=...
BOT_INTERNAL_TOKEN=...      # same as Vercel
TELEGRAM_LINK_SECRET=...    # same as Vercel
API_BASE_URL=https://...    # Vercel URL
WEB_APP_BASE_URL=https://... # public URL for Mini App buttons
# BOT_PUBLIC_URL=          # unset = polling
# SENTRY_DSN=              # optional
# PORT=8080                # health / webhook listen port
```

---

## VPS + Docker Compose

Cheapest long-term option for 24/7 polling (~€4/mo for a 4 GB Hetzner CX23).
budu alone is fine on 1–2 GB.

### 1. Server prep (once)

Ubuntu/Debian VPS with Docker Engine + Compose plugin:

```bash
# example: Hetzner CX23 (2 vCPU, 4 GB) in Falkenstein or Nuremberg
sudo apt update && sudo apt install -y git docker.io docker-compose-v2
sudo usermod -aG docker "$USER"   # re-login after this
```

Clone and configure:

```bash
mkdir -p ~/apps && cd ~/apps

git clone https://github.com/sergeyt/budu.git
cd budu
cp bot/.env.example bot/.env
# edit bot/.env — production URLs and secrets (must match Vercel)
```

### 2. Start the bot

From repo root:

```bash
docker compose up -d --build
docker compose logs -f budu-bot
```

Ops:

```bash
docker compose ps
docker compose restart budu-bot
docker compose pull && docker compose up -d --build   # after git pull
```

Polling mode needs **no public inbound ports**. Uncomment `ports` in
[`docker-compose.yml`](../docker-compose.yml) only if you want localhost health
checks or webhook mode behind a reverse proxy.

Typical RAM: ~50–150 MB. Health port: `8080`.

---

## Polling vs webhook

| Mode | Telegram | Inbound |
| --- | --- | --- |
| **Polling** (default) | Bot pulls updates via `getUpdates` | None required; `/health` still listens on `PORT` |
| **Webhook** | Telegram POSTs to `{BOT_PUBLIC_URL}/webhook` | Expose `PORT` (reverse proxy + HTTPS) |

Leave `BOT_PUBLIC_URL` unset for polling. For webhook, set it to the public
HTTPS origin that reaches the container, and uncomment `ports` (or put a proxy
in front).

---

## Local Docker smoke (optional)

From repo root:

```bash
docker build -f bot/Dockerfile -t budu-bot .
docker run --rm --env-file bot/.env budu-bot
```

Use `API_BASE_URL=http://host.docker.internal:3000` on macOS if Next runs on
the host.
