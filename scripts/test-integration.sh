#!/usr/bin/env bash
# One-shot runner for integration tests against a disposable Postgres 17.
#
# Usage:
#   scripts/test-integration.sh                # run all integration tests
#   scripts/test-integration.sh -t "lock"      # forward args to vitest
#   KEEP=1 scripts/test-integration.sh         # leave the container running
#   PG_PORT=55432 scripts/test-integration.sh  # override the host port
#
# Requirements: docker + pnpm.

set -euo pipefail

CONTAINER=${PG_CONTAINER:-budu-pg-test}
PORT=${PG_PORT:-54329}
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

# Drop any leftover container from a previous interrupted run.
docker rm -f "$CONTAINER" >/dev/null 2>&1 || true

echo "Starting $IMAGE on port $PORT..."
docker run -d --name "$CONTAINER" \
  -e POSTGRES_USER=budu \
  -e POSTGRES_PASSWORD=budu \
  -e POSTGRES_DB=budu_test \
  -p "$PORT:5432" \
  "$IMAGE" >/dev/null

# Wait for Postgres to accept connections (up to 30s).
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

pnpm test:integration "$@"
