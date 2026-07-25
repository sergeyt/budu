#!/usr/bin/env bash
# Re-deploy budu-bot on a VPS (Docker Compose).
# Run on the VM from anywhere; requires git + docker compose.
#
# Usage:
#   ./scripts/redeploy-bot.sh
#   ./scripts/redeploy-bot.sh --no-pull   # rebuild/restart without git pull

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PULL=1
for arg in "$@"; do
  case "$arg" in
    --no-pull) PULL=0 ;;
    -h|--help)
      sed -n '2,8p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

if [[ ! -f bot/.env ]]; then
  echo "Missing bot/.env — copy bot/.env.example and fill production secrets." >&2
  exit 1
fi

if [[ "$PULL" -eq 1 ]]; then
  echo "==> git pull"
  git pull --ff-only
fi

echo "==> docker compose up -d --build"
docker compose up -d --build

echo "==> status"
docker compose ps
echo
echo "==> recent logs"
docker compose logs --tail=50 budu-bot
echo
echo "Done. Follow logs with: docker compose logs -f budu-bot"
