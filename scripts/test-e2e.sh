#!/usr/bin/env bash
# One-shot runner for Playwright e2e tests against a disposable Postgres 17.
#
# Usage:
#   scripts/test-e2e.sh                # run all e2e specs
#   scripts/test-e2e.sh e2e/home.spec.ts
#   KEEP=1 scripts/test-e2e.sh         # leave the container running
#   PG_PORT=55433 scripts/test-e2e.sh  # override the host port
#
# Requirements: docker + pnpm. Chromium: `pnpm exec playwright install chromium`.

set -euo pipefail

CONTAINER=${PG_CONTAINER:-budu-pg-e2e}
PORT=${PG_PORT:-54330}
IMAGE=${PG_IMAGE:-postgres:17}
KEEP=${KEEP:-0}

if ! command -v docker >/dev/null 2>&1; then
  echo "error: docker is required" >&2
  exit 1
fi
if ! docker info >/dev/null 2>&1; then
  echo "error: docker daemon is not reachable" >&2
  exit 1
fi

cleanup() {
  if [[ "$KEEP" != "1" ]]; then
    docker rm -f "$CONTAINER" >/dev/null 2>&1 || true
  fi
}
trap cleanup EXIT

docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

echo "Starting $IMAGE on port $PORT..."
docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER=budu \
  -e POSTGRES_PASSWORD=budu \
  -e POSTGRES_DB=budu_test \
  -p "$PORT:5432" \
  "$IMAGE" >/dev/null

for _ in $(seq 1 30); do
  if docker exec "$CONTAINER" pg_isready -U budu -d budu_test >/dev/null 2>&1; then
    ready=1
    break
  fi
  sleep 1
done

if [[ "${ready:-0}" != "1" ]]; then
  echo "error: Postgres failed to become ready in 30s" >&2
  docker logs "$CONTAINER" >&2 || true
  exit 1
fi

export DATABASE_URL="postgresql://budu:budu@localhost:$PORT/budu_test?schema=public"
export AUTH_SECRET="${AUTH_SECRET:-e2e-secret}"
export AUTH_URL="${AUTH_URL:-http://127.0.0.1:3100}"
export AUTH_TRUST_HOST=true
export AUTH_PASSWORD_LOGIN=1
export NEXT_PUBLIC_PASSWORD_LOGIN=1

pnpm test:e2e "$@"
