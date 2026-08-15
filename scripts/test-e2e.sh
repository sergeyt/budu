#!/usr/bin/env bash
# Back-compat wrapper. Prefer: scripts/e2e.sh run [--headed]
exec "$(cd "$(dirname "$0")" && pwd)/e2e.sh" run "$@"
