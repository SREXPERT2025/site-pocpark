#!/usr/bin/env bash
set -Eeuo pipefail

APP_DIR="${1:-}"
EXPECTED_SITE_SHA="${2:-}"
ENV_FILE="${3:-${APP_DIR}/.env.production}"
RUNTIME_SHA="5713258de76d4aa689baf30eae016df54cd8d579"
CONTRACT_SHA="8834367e7412656b5a83d0c01b05dbffae6d3dee"
SCRIPT_DIR="$(CDPATH= cd -- "$(dirname -- "$0")" && pwd -P)"

test -n "$APP_DIR"
test -n "$EXPECTED_SITE_SHA"
test "${#EXPECTED_SITE_SHA}" -eq 40
test "$(git -C "$APP_DIR" rev-parse HEAD)" = "$EXPECTED_SITE_SHA"
test -z "$(git -C "$APP_DIR" status --porcelain)"
test -f "$ENV_FILE"
test "$(stat -f '%Lp' "$ENV_FILE" 2>/dev/null || stat -c '%a' "$ENV_FILE")" = "600"
test "$(grep -c '^AI_CORE_OWNER_CANARY_ENABLED=false$' "$ENV_FILE")" = "1"
test "$(grep -c "^AI_CORE_OWNER_CANARY_RUNTIME_SHA=${RUNTIME_SHA}$" "$ENV_FILE")" = "1"
test "$(grep -c "^AI_CORE_OWNER_CANARY_CONTRACT_SHA=${CONTRACT_SHA}$" "$ENV_FILE")" = "1"

env_value() {
  awk -v key="$1" 'index($0, key "=") == 1 {print substr($0, length(key) + 2); exit}' "$ENV_FILE"
}

GATEWAY_URL="$(env_value AI_CORE_OWNER_CANARY_URL)"
GATEWAY_SECRET="$(env_value AI_CORE_OWNER_CANARY_SECRET)"
test -n "$GATEWAY_URL"
test "${#GATEWAY_SECRET}" -ge 32

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

curl -fsS \
  -H "Authorization: Bearer ${GATEWAY_SECRET}" \
  "${GATEWAY_URL%/}/health" \
  -o "$TMP_DIR/health.json"
node -e '
  const fs = require("fs");
  const [path, runtime, contract] = process.argv.slice(1);
  const value = JSON.parse(fs.readFileSync(path, "utf8"));
  if (value.status !== "ok"
    || value.owner_ai_core_ready !== true
    || value.owner_ai_core_runtime_sha !== runtime
    || value.owner_ai_core_contract_sha !== contract) process.exit(1);
' "$TMP_DIR/health.json" "$RUNTIME_SHA" "$CONTRACT_SHA"

node "$SCRIPT_DIR/configure_owner_ai_canary_env.mjs" "$ENV_FILE" true
pm2 restart rospark-site --update-env >/dev/null
test "$(pm2 jlist | node -e '
  let s=""; process.stdin.on("data",d=>s+=d).on("end",()=>{
    const app=JSON.parse(s).find(x=>x.name==="rospark-site");
    process.stdout.write(app?.pm2_env?.status || "missing");
  });
')" = "online"
test "$(grep -c '^AI_CORE_OWNER_CANARY_ENABLED=true$' "$ENV_FILE")" = "1"

FINALIZED=1
rm -rf "$TMP_DIR"
trap - EXIT HUP INT TERM
echo "OWNER_CANARY_ENABLED=true"
echo "MODEL_REQUESTS=0"
echo "PUBLIC_ROUTE_CHANGED=0"
