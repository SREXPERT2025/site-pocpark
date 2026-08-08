#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${1:-}"
EXPECTED_SITE_SHA="${2:-}"
ENV_FILE="${3:-${APP_DIR}/.env.production}"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
LIB="$SCRIPT_DIR/owner_canary_v4_lib.sh"
LOCK_DIR="/run/lock/rospark-owner-ai-canary-v4"
ACTIVATION_ID="owner-canary-v4-disable-$(date -u +%Y%m%dT%H%M%SZ)-$$"
PUBLIC_HOST="www.xn--80aukedde.xn--p1ai"
LOCAL_STATUS_URL="http://127.0.0.1:3000/api/ai-widget/status"
PUBLIC_STATUS_URL="https://${PUBLIC_HOST}/api/ai-widget/status"
LOCK_ACQUIRED=0

test -f "$LIB"
# shellcheck source=owner_canary_v4_lib.sh
source "$LIB"

cleanup() {
  local code="$1"
  trap - ERR HUP INT TERM
  if test "$LOCK_ACQUIRED" -eq 1; then
    owner_v4_release_lock "$LOCK_DIR" "$ACTIVATION_ID" || code=90
  fi
  exit "$code"
}
trap 'cleanup "$?"' ERR HUP INT TERM

test -n "$APP_DIR"
test "${#EXPECTED_SITE_SHA}" -eq 40
test "$(git -C "$APP_DIR" rev-parse HEAD)" = "$EXPECTED_SITE_SHA"
test -z "$(git -C "$APP_DIR" status --porcelain)"
test -f "$ENV_FILE"
owner_v4_assert_file_mode "$ENV_FILE" 600

if test -n "${OWNER_V4_EXISTING_LOCK_ID:-}"; then
  test -f "$LOCK_DIR/metadata"
  test "$(awk -F= '$1=="activation_id" {print $2; exit}' "$LOCK_DIR/metadata")" = "$OWNER_V4_EXISTING_LOCK_ID"
else
  owner_v4_acquire_lock "$LOCK_DIR" "$ACTIVATION_ID" "$EXPECTED_SITE_SHA" site-owner-canary-v4-disable
  LOCK_ACQUIRED=1
fi

if test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_ENABLED)" = false; then
  echo "OWNER_CANARY_ALREADY_DISABLED=yes"
  owner_v4_wait_readiness \
    "$APP_DIR" "$EXPECTED_SITE_SHA" "$LOCAL_STATUS_URL" \
    "$PUBLIC_STATUS_URL" "$PUBLIC_HOST" 120000 1
else
  echo "[CANONICAL OWNER-CANARY DISABLE]"
  owner_v4_set_flag_and_wait \
    "$APP_DIR" "$ENV_FILE" "$EXPECTED_SITE_SHA" false \
    "$LOCAL_STATUS_URL" "$PUBLIC_STATUS_URL" "$PUBLIC_HOST" \
    canary_disable 120000
fi

test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_ENABLED)" = false
if test "$LOCK_ACQUIRED" -eq 1; then
  owner_v4_release_lock "$LOCK_DIR" "$ACTIVATION_ID"
  LOCK_ACQUIRED=0
fi
trap - ERR HUP INT TERM
echo "OWNER_CANARY_ENABLED=false"
echo "ROLLBACK_READINESS=pass"
echo "NORMAL_VISITOR_ROUTE=legacy"
echo "DIAGNOSTIC_EVIDENCE_RETAINED=yes"
echo "GATEWAY_A_ROLLBACK=0"
echo "SITE_FOUNDATION_B_ROLLBACK=0"
