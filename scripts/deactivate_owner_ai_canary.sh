#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${1:-}"
EXPECTED_SITE_SHA="${2:-}"
ENV_FILE="${3:-${APP_DIR}/.env.production}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"

test -n "$APP_DIR"
test "${#EXPECTED_SITE_SHA}" -eq 40
test "$(git -C "$APP_DIR" rev-parse HEAD)" = "$EXPECTED_SITE_SHA"
test -f "$ENV_FILE"
test "$(stat -f '%Lp' "$ENV_FILE" 2>/dev/null || stat -c '%a' "$ENV_FILE")" = "600"

TMP_DIR="$(mktemp -d)"
BACKUP="$TMP_DIR/env.before"
cp -p "$ENV_FILE" "$BACKUP"
FINALIZED=0
rollback() {
  if test "$FINALIZED" -eq 0
  then
    cp -p "$BACKUP" "$ENV_FILE"
    pm2 restart rospark-site --update-env >/dev/null 2>&1 || true
  fi
  rm -rf "$TMP_DIR"
}
trap rollback EXIT HUP INT TERM

node "$SCRIPT_DIR/configure_owner_ai_canary_env.mjs" "$ENV_FILE" false
pm2 restart rospark-site --update-env >/dev/null
test "$(grep -c '^AI_CORE_OWNER_CANARY_ENABLED=false$' "$ENV_FILE")" = "1"

FINALIZED=1
rm -rf "$TMP_DIR"
trap - EXIT HUP INT TERM
echo "OWNER_CANARY_ENABLED=false"
echo "DIAGNOSTIC_EVIDENCE_RETAINED=yes"
echo "GATEWAY_A_ROLLBACK=0"
echo "SITE_FOUNDATION_B_ROLLBACK=0"
