#!/usr/bin/env bash
# Deploy budu-bot from this Mac to the Hetzner VPS (git pull + docker compose).
#
# Usage:
#   ./scripts/deploy-bot.sh
#   ./scripts/deploy-bot.sh --no-push   # skip local git push
#   ./scripts/deploy-bot.sh --logs      # follow logs after rebuild
#
# Pushes the current branch, SSHs to the VM (same host as `ssh-tbots`),
# then runs scripts/redeploy-bot.sh (git pull --ff-only + compose rebuild).
# Remote dir: ~/budu. Override:
#   DEPLOY_HOST=root@1.2.3.4 DEPLOY_DIR=/root/budu SSHPASS=... ./scripts/deploy-bot.sh

set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
PUSH=1
FOLLOW_LOGS=0

for arg in "$@"; do
  case "$arg" in
    --no-push) PUSH=0 ;;
    --logs) FOLLOW_LOGS=1 ;;
    -h|--help)
      sed -n '2,14p' "$0"
      exit 0
      ;;
    *)
      echo "Unknown option: $arg" >&2
      exit 1
      ;;
  esac
done

fill_sshpass_from_tbots_alias() {
  [[ -n "${SSHPASS:-}" ]] && return 0
  local zshrc="${HOME}/.zshrc"
  [[ -f "$zshrc" ]] || return 0
  local line rest
  line="$(grep -E "^alias ssh-tbots=" "$zshrc" | tail -n1 || true)"
  [[ -n "$line" ]] || return 0
  rest="${line#*ssh-tbots=}"
  rest="${rest#\'}"
  rest="${rest%\'}"
  rest="${rest#\"}"
  rest="${rest%\"}"
  if [[ "$rest" =~ sshpass[[:space:]]+-p[[:space:]]+([^[:space:]]+)[[:space:]]+ssh[[:space:]]+([^[:space:]]+) ]]; then
    export SSHPASS="${BASH_REMATCH[1]}"
    if [[ -z "${DEPLOY_HOST:-}" ]]; then
      DEPLOY_HOST="${BASH_REMATCH[2]}"
    fi
  fi
}

fill_sshpass_from_tbots_alias

HOST="${DEPLOY_HOST:-root@37.27.240.1}"
REMOTE_DIR="${DEPLOY_DIR:-/root/budu}"

SSH=(ssh -o StrictHostKeyChecking=accept-new)
if command -v sshpass >/dev/null 2>&1 && [[ -n "${SSHPASS:-}" ]]; then
  SSH=(sshpass -e ssh -o StrictHostKeyChecking=accept-new)
fi

cd "$ROOT"

if [[ -n "$(git status --porcelain)" ]]; then
  echo "Note: uncommitted local changes will not be deployed." >&2
fi

if [[ "$PUSH" -eq 1 ]]; then
  echo "==> git push"
  git push
fi

echo "==> $HOST:$REMOTE_DIR  git pull + docker compose"
"${SSH[@]}" "$HOST" "cd $(printf '%q' "$REMOTE_DIR") && ./scripts/redeploy-bot.sh"

if [[ "$FOLLOW_LOGS" -eq 1 ]]; then
  echo "==> following logs (Ctrl-C to detach; container keeps running)"
  "${SSH[@]}" -t "$HOST" "cd $(printf '%q' "$REMOTE_DIR") && docker compose logs -f budu-bot"
fi
