#!/usr/bin/env bash
set -Eeuo pipefail
umask 077

APP_DIR="${1:-}"
EXPECTED_SITE_SHA="${2:-}"
ENV_FILE="${3:-${APP_DIR}/.env.production}"
RUNTIME_SHA="5713258de76d4aa689baf30eae016df54cd8d579"
CONTRACT_SHA="8834367e7412656b5a83d0c01b05dbffae6d3dee"
GATEWAY_A_SHA="e0b4edd34d5fecaf8850e64aa03a33c2661b51f9"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"
LIB="$SCRIPT_DIR/owner_canary_v4_lib.sh"
LOCK_DIR="/run/lock/rospark-owner-ai-canary-v4"
ACTIVATION_ID="owner-canary-v4-$(date -u +%Y%m%dT%H%M%SZ)-$$"
PUBLIC_HOST="www.xn--80aukedde.xn--p1ai"
LOCAL_STATUS_URL="http://127.0.0.1:3000/api/ai-widget/status"
PUBLIC_STATUS_URL="https://${PUBLIC_HOST}/api/ai-widget/status"
OWNER_STATUS_URL="https://${PUBLIC_HOST}/api/ai-widget/owner-canary/status"
OWNER_LOGIN_URL="https://${PUBLIC_HOST}/api/ai-widget/owner-canary/login"
OWNER_LOGOUT_URL="https://${PUBLIC_HOST}/api/ai-widget/owner-canary/logout"
AI_DB="/var/lib/rospark-ai-widget/dialogs.sqlite"
LEAD_DB="/var/lib/rospark-leads/lead-registry.sqlite"
TMP_DIR=""
LOCK_ACQUIRED=0
MUTATION_STARTED=0
FINALIZED=0

test -f "$LIB"
# shellcheck source=owner_canary_v4_lib.sh
source "$LIB"

release_lock_if_owned() {
  if test "$LOCK_ACQUIRED" -eq 1; then
    owner_v4_release_lock "$LOCK_DIR" "$ACTIVATION_ID"
    LOCK_ACQUIRED=0
  fi
}

cleanup_tmp() {
  if test -n "$TMP_DIR" && test -d "$TMP_DIR"; then
    rm -rf "$TMP_DIR"
  fi
}

rollback() {
  local code="$1" rollback_ok=1
  trap - ERR HUP INT TERM
  if test "$MUTATION_STARTED" -eq 1 && test "$FINALIZED" -eq 0; then
    echo "[CANONICAL CANARY-ONLY ROLLBACK]"
    if owner_v4_set_flag_and_wait \
      "$APP_DIR" "$ENV_FILE" "$EXPECTED_SITE_SHA" false \
      "$LOCAL_STATUS_URL" "$PUBLIC_STATUS_URL" "$PUBLIC_HOST" \
      rollback 120000; then
      echo "ROLLBACK_READINESS=pass"
      echo "OWNER_CANARY_ENABLED=false"
    else
      rollback_ok=0
      echo "ROLLBACK_READINESS=fail" >&2
    fi
  fi
  cleanup_tmp
  release_lock_if_owned || rollback_ok=0
  if test "$rollback_ok" -ne 1; then
    exit 90
  fi
  exit "$code"
}
trap 'rollback "$?"' ERR HUP INT TERM

test -n "$APP_DIR"
test -n "$EXPECTED_SITE_SHA"
test "${#EXPECTED_SITE_SHA}" -eq 40
test -f "$ENV_FILE"
owner_v4_assert_file_mode "$ENV_FILE" 600
test "$(git -C "$APP_DIR" rev-parse HEAD)" = "$EXPECTED_SITE_SHA"
test -z "$(git -C "$APP_DIR" status --porcelain)"
test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_ENABLED)" = false
test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_RUNTIME_SHA)" = "$RUNTIME_SHA"
test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_CONTRACT_SHA)" = "$CONTRACT_SHA"
test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_GATEWAY_SHA)" = "$GATEWAY_A_SHA"

if test -n "${OWNER_V4_EXISTING_LOCK_ID:-}"; then
  test -f "$LOCK_DIR/metadata"
  test "$(awk -F= '$1=="activation_id" {print $2; exit}' "$LOCK_DIR/metadata")" = "$OWNER_V4_EXISTING_LOCK_ID"
else
  owner_v4_acquire_lock "$LOCK_DIR" "$ACTIVATION_ID" "$EXPECTED_SITE_SHA" site-owner-canary-v4
  LOCK_ACQUIRED=1
fi

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/owner-canary-v4.XXXXXX")"

echo "[PHASE A — SITE TARGET READY WITH CANARY OFF]"
owner_v4_wait_readiness \
  "$APP_DIR" "$EXPECTED_SITE_SHA" "$LOCAL_STATUS_URL" \
  "$PUBLIC_STATUS_URL" "$PUBLIC_HOST" 120000 1
test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_ENABLED)" = false

echo "[PHASE B — EXACT CORE CONNECTIVITY AND CONTRACT]"
GATEWAY_URL="$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_URL)"
GATEWAY_SECRET="$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_SECRET)"
test "${GATEWAY_URL#https://}" != "$GATEWAY_URL"
test "${#GATEWAY_SECRET}" -ge 32
curl -fsS --max-time 20 -H "Authorization: Bearer ${GATEWAY_SECRET}" \
  "${GATEWAY_URL%/}/health" -o "$TMP_DIR/gateway-health.json"
node -e '
const fs=require("fs");
const [path,runtime,contract]=process.argv.slice(1);
const v=JSON.parse(fs.readFileSync(path,"utf8"));
if(v.status!=="ok"||v.runtime_mode!=="production"||v.owner_ai_core_ready!==true||v.owner_ai_core_runtime_sha!==runtime||v.owner_ai_core_contract_sha!==contract)process.exit(1);
' "$TMP_DIR/gateway-health.json" "$RUNTIME_SHA" "$CONTRACT_SHA"

cd "$APP_DIR"
NODE_PATH="$APP_DIR/node_modules" npm run test:owner-ai-canary
npm run test:owner-ai-canary-env
npm run test:ai-widget-server-events

FORGED_LOGIN_CODE="$(curl -sS --max-time 20 \
  --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -H "Origin: https://${PUBLIC_HOST}" -H 'Content-Type: application/json' \
  --data '{"credential":"forged-owner-cookie-must-not-pass"}' \
  -o "$TMP_DIR/forged-login.json" -w '%{http_code}' "$OWNER_LOGIN_URL")"
test "$FORGED_LOGIN_CODE" = 403

LEADS_BEFORE="$(sqlite3 -readonly "$LEAD_DB" 'SELECT COUNT(*) FROM lead_records;')"
OUTBOX_BEFORE="$(sqlite3 -readonly "$LEAD_DB" 'SELECT COUNT(*) FROM lead_notification_outbox;')"
AI_LEADS_BEFORE="$(sqlite3 -readonly "$AI_DB" 'SELECT COUNT(*) FROM ai_widget_production_leads;')"

echo "[PHASE C — ENABLE OWNER-ONLY CANARY]"
MUTATION_STARTED=1
owner_v4_set_flag_and_wait \
  "$APP_DIR" "$ENV_FILE" "$EXPECTED_SITE_SHA" true \
  "$LOCAL_STATUS_URL" "$PUBLIC_STATUS_URL" "$PUBLIC_HOST" \
  canary_enable 120000

echo "[CANARY ON ROUTING ACCEPTANCE — NO MODEL]"
NORMAL_CODE="$(curl -sS --max-time 20 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -H "Origin: https://${PUBLIC_HOST}" -o "$TMP_DIR/normal-status.json" \
  -w '%{http_code}' "$OWNER_STATUS_URL")"
test "$NORMAL_CODE" = 200
node -e '
const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
if(v.enabled!==true||v.audience!=="legacy"||v.route!=="legacy")process.exit(1);
' "$TMP_DIR/normal-status.json"

FORGED_STATUS_CODE="$(curl -sS --max-time 20 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -H "Origin: https://${PUBLIC_HOST}" \
  -H 'Cookie: __Host-rospark-owner-ai-canary=forged.invalid' \
  -o "$TMP_DIR/forged-status.json" -w '%{http_code}' "$OWNER_STATUS_URL")"
test "$FORGED_STATUS_CODE" = 401
node -e '
const fs=require("fs"); const v=JSON.parse(fs.readFileSync(process.argv[1],"utf8"));
if(v.audience!=="legacy"||v.route!=="legacy"||v.code!=="OWNER_AUTH_DENIED")process.exit(1);
' "$TMP_DIR/forged-status.json"

ENV_FILE="$ENV_FILE" node - "$TMP_DIR/expired-token.txt" <<'NODE'
const fs=require('fs'); const crypto=require('crypto');
const env=Object.fromEntries(fs.readFileSync(process.env.ENV_FILE,'utf8').split(/\r?\n/).flatMap(line=>{
  const match=line.match(/^([A-Z][A-Z0-9_]*)=(.*)$/); return match?[[match[1],match[2].replace(/^['"]|['"]$/g,'')]]:[];
}));
const now=Math.floor(Date.now()/1000);
const payload={v:env.AI_CORE_OWNER_CANARY_SESSION_VERSION||'v1',jti:'expired-owner-v4-00000001',iat:now-120,exp:now-60};
const encoded=Buffer.from(JSON.stringify(payload)).toString('base64url');
const signature=crypto.createHmac('sha256',env.AI_CORE_OWNER_CANARY_COOKIE_KEY).update(encoded).digest('base64url');
fs.writeFileSync(process.argv[2],`${encoded}.${signature}\n`,{mode:0o600});
NODE
EXPIRED_TOKEN="$(tr -d '\r\n' < "$TMP_DIR/expired-token.txt")"
EXPIRED_CODE="$(curl -sS --max-time 20 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -H "Origin: https://${PUBLIC_HOST}" \
  -H "Cookie: __Host-rospark-owner-ai-canary=${EXPIRED_TOKEN}" \
  -o "$TMP_DIR/expired-status.json" -w '%{http_code}' "$OWNER_STATUS_URL")"
test "$EXPIRED_CODE" = 401

ENV_FILE="$ENV_FILE" node - "$TMP_DIR/login.json" <<'NODE'
const fs=require('fs');
const line=fs.readFileSync(process.env.ENV_FILE,'utf8').split(/\r?\n/).find(v=>v.startsWith('AI_CORE_OWNER_CANARY_CREDENTIAL='));
if(!line) process.exit(1);
const credential=line.slice(line.indexOf('=')+1).replace(/^['"]|['"]$/g,'');
fs.writeFileSync(process.argv[2],JSON.stringify({credential}),{mode:0o600});
NODE
LOGIN_CODE="$(curl -sS --max-time 20 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -H "Origin: https://${PUBLIC_HOST}" -H 'Content-Type: application/json' \
  --data-binary "@$TMP_DIR/login.json" -c "$TMP_DIR/owner-cookie.jar" \
  -o "$TMP_DIR/login-response.json" -w '%{http_code}' "$OWNER_LOGIN_URL")"
test "$LOGIN_CODE" = 200

OWNER_STATUS_CODE="$(curl -sS --max-time 20 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -H "Origin: https://${PUBLIC_HOST}" -b "$TMP_DIR/owner-cookie.jar" \
  -o "$TMP_DIR/owner-status.json" -w '%{http_code}' "$OWNER_STATUS_URL")"
test "$OWNER_STATUS_CODE" = 200
node -e '
const fs=require("fs"); const [path,runtime,contract]=process.argv.slice(1); const v=JSON.parse(fs.readFileSync(path,"utf8"));
if(v.enabled!==true||v.audience!=="owner_canary"||v.route!=="ai_core"||v.runtimeSha!==runtime||v.contractSha!==contract||!String(v.marker).includes("AI Core Owner Test"))process.exit(1);
' "$TMP_DIR/owner-status.json" "$RUNTIME_SHA" "$CONTRACT_SHA"

LOGOUT_CODE="$(curl -sS --max-time 20 --resolve "${PUBLIC_HOST}:443:127.0.0.1" \
  -X POST -H "Origin: https://${PUBLIC_HOST}" -b "$TMP_DIR/owner-cookie.jar" \
  -o "$TMP_DIR/logout.json" -w '%{http_code}' "$OWNER_LOGOUT_URL")"
test "$LOGOUT_CODE" = 200

test "$LEADS_BEFORE" = "$(sqlite3 -readonly "$LEAD_DB" 'SELECT COUNT(*) FROM lead_records;')"
test "$OUTBOX_BEFORE" = "$(sqlite3 -readonly "$LEAD_DB" 'SELECT COUNT(*) FROM lead_notification_outbox;')"
test "$AI_LEADS_BEFORE" = "$(sqlite3 -readonly "$AI_DB" 'SELECT COUNT(*) FROM ai_widget_production_leads;')"
test "$(owner_v4_env_value "$ENV_FILE" AI_CORE_OWNER_CANARY_ENABLED)" = true

FINALIZED=1
cleanup_tmp
release_lock_if_owned
trap - ERR HUP INT TERM
echo "OWNER_CANARY_ENABLED=true"
echo "NORMAL_VISITOR_ROUTE=legacy"
echo "FORGED_COOKIE_ROUTE=legacy_unauthorized"
echo "EXPIRED_COOKIE_ROUTE=legacy_unauthorized"
echo "AUTHENTICATED_OWNER_ROUTE=ai_core"
echo "OWNER_FAILURE_SILENT_LEGACY_FALLBACK=0"
echo "RUNTIME_SHA=$RUNTIME_SHA"
echo "CONTRACT_SHA=$CONTRACT_SHA"
echo "GATEWAY_A_SHA=$GATEWAY_A_SHA"
echo "SITE_FOUNDATION_B=active"
echo "MODEL_REQUESTS=0"
echo "CODEX_REQUESTS=0"
echo "LEADS_CREATED=0"
echo "MAX_MESSAGES_SENT=0"
echo "CRM_MUTATION_PATHS_IN_SCRIPT=0"
