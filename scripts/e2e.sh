#!/usr/bin/env bash
# Manage the Playwright e2e stack (Postgres + Next in Compose) and reports.
#
# Usage:
#   scripts/e2e.sh up                         # build & start containers
#   scripts/e2e.sh down                       # stop containers, drop volumes
#   scripts/e2e.sh test [--headed] [specs…]   # run Playwright (stack must be up)
#   scripts/e2e.sh run  [--headed] [specs…]   # up + test + down
#   scripts/e2e.sh report                     # open the last HTML report
#
# Flags (also as env):
#   --headed / E2E_HEADED=1   visible browser, slowed clicks
#   --ui                      Playwright UI mode (interactive)
#   --keep / KEEP=1           leave containers running after `run`
#   --open                    open the HTML report when tests finish
#
# Examples:
#   scripts/e2e.sh run --headed e2e/home.spec.ts
#   KEEP=1 scripts/e2e.sh run --headed
#   scripts/e2e.sh report
#
# Requirements: docker compose + pnpm.
# Chromium: `pnpm exec playwright install chromium`.

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

COMPOSE=(docker compose --env-file /dev/null -f docker-compose.e2e.yml)
REPORT_DIR="$ROOT/playwright-report"
E2E_PG_PORT="${E2E_PG_PORT:-55432}"

HEADED=0
UI=0
KEEP="${KEEP:-0}"
OPEN_REPORT=0
CMD=""
PW_ARGS=()

usage() {
  cat <<'EOF'
Manage the Playwright e2e stack (Postgres + Next in Compose) and reports.

Usage:
  scripts/e2e.sh up                         # build & start containers
  scripts/e2e.sh down                       # stop containers, drop volumes
  scripts/e2e.sh test [--headed] [specs…]   # run Playwright (stack must be up)
  scripts/e2e.sh run  [--headed] [specs…]   # up + test + down
  scripts/e2e.sh report                     # open the last HTML report

Flags (also as env):
  --headed / E2E_HEADED=1   visible browser, slowed clicks
  --ui                      Playwright UI mode (interactive)
  --keep / KEEP=1           leave containers running after `run`
  --open                    open the HTML report when tests finish

  E2E_PG_PORT=55432         host port for Postgres (avoids Postgres.app on 5432)

Examples:
  scripts/e2e.sh run --headed e2e/home.spec.ts
  KEEP=1 scripts/e2e.sh run --headed
  scripts/e2e.sh report

Requirements: docker compose + pnpm.
Chromium: pnpm exec playwright install chromium
EOF
}

need_docker() {
  if ! command -v docker >/dev/null 2>&1; then
    echo "error: docker is required" >&2
    exit 1
  fi
  if ! docker info >/dev/null 2>&1; then
    echo "error: docker daemon is not reachable" >&2
    exit 1
  fi
}

export_e2e_env() {
  export E2E_PG_PORT
  export DATABASE_URL="postgresql://budu:budu@localhost:${E2E_PG_PORT}/budu_test?schema=public"
  export AUTH_SECRET="${AUTH_SECRET:-e2e-secret}"
  export AUTH_URL="${AUTH_URL:-http://127.0.0.1:3100}"
  export AUTH_TRUST_HOST=true
  export AUTH_PASSWORD_LOGIN=1
  export NEXT_PUBLIC_PASSWORD_LOGIN=1
  export E2E_REUSE_SERVER=1
  if [[ "$HEADED" == "1" ]]; then
    export E2E_HEADED=1
  fi
}

cmd_up() {
  need_docker
  export E2E_PG_PORT
  echo "Starting e2e stack (Postgres 17 + Next.js)..."
  "${COMPOSE[@]}" up --build -d --wait
  echo "Web  http://127.0.0.1:3100"
  echo "DB   postgresql://budu:budu@localhost:${E2E_PG_PORT}/budu_test"
}

cmd_down() {
  need_docker
  echo "Stopping e2e stack..."
  "${COMPOSE[@]}" down -v
}

print_report_hint() {
  if [[ -f "$REPORT_DIR/index.html" ]]; then
    echo
    echo "HTML report: $REPORT_DIR/index.html"
    echo "  scripts/e2e.sh report"
  fi
  if [[ -f "$REPORT_DIR/results.json" ]]; then
    echo "JSON report: $REPORT_DIR/results.json"
  fi
}

cmd_test() {
  export_e2e_env
  local extra=()
  if [[ "$UI" == "1" ]]; then
    extra+=(--ui)
  elif [[ "$HEADED" == "1" ]]; then
    extra+=(--headed)
  fi

  local status=0
  pnpm exec playwright test "${extra[@]}" "${PW_ARGS[@]}" || status=$?
  print_report_hint
  if [[ "$OPEN_REPORT" == "1" && -f "$REPORT_DIR/index.html" ]]; then
    pnpm exec playwright show-report
  fi
  return "$status"
}

cmd_report() {
  if [[ ! -f "$REPORT_DIR/index.html" ]]; then
    echo "error: no report at $REPORT_DIR (run tests first)" >&2
    exit 1
  fi
  pnpm exec playwright show-report
}

cmd_run() {
  need_docker
  if [[ "$KEEP" != "1" ]]; then
    trap cmd_down EXIT
  fi
  cmd_up
  cmd_test
}

if [[ "${E2E_HEADED:-}" == "1" ]]; then
  HEADED=1
fi

while [[ $# -gt 0 ]]; do
  case "$1" in
    -h | --help)
      usage
      exit 0
      ;;
    --headed)
      HEADED=1
      shift
      ;;
    --ui)
      UI=1
      shift
      ;;
    --keep)
      KEEP=1
      shift
      ;;
    --open)
      OPEN_REPORT=1
      shift
      ;;
    up | down | test | run | report)
      if [[ -n "$CMD" ]]; then
        PW_ARGS+=("$1")
      else
        CMD="$1"
      fi
      shift
      ;;
    *)
      if [[ -z "$CMD" ]]; then
        echo "error: unknown command '$1' (try up|down|test|run|report)" >&2
        usage >&2
        exit 1
      fi
      PW_ARGS+=("$1")
      shift
      ;;
  esac
done

if [[ -z "$CMD" ]]; then
  usage >&2
  exit 1
fi

"cmd_$CMD"
