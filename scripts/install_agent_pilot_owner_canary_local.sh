#!/bin/zsh
set -euo pipefail

RUNTIME_SHA="a46b7965938e369c20e25e7610fcf6b150135c21"
LABEL="ai.pocpark.agent-pilot-owner-canary"
SCRIPT_DIR="${0:A:h}"
SITE_ROOT="${SCRIPT_DIR:h}"
BASE_DIR="${HOME}/Library/Application Support/ROSPARK/agent-pilot-owner-canary"
RELEASE_ROOT="${BASE_DIR}/releases/${RUNTIME_SHA}"
BRIDGE_DIR="${BASE_DIR}/bridge/v1"
STATE_DIR="${BASE_DIR}/state"
TRACE_DIR="${BASE_DIR}/traces"
LOG_DIR="${BASE_DIR}/logs"
CONFIG_PATH="${BASE_DIR}/bridge.env"
PLIST_PATH="${HOME}/Library/LaunchAgents/${LABEL}.plist"
PYTHON_BIN="$(command -v python3)"

test -x "${PYTHON_BIN}"
test -f "${RELEASE_ROOT}/agent-pilot/runtime/live/controlled_pilot.py"
test "$(git -C "${RELEASE_ROOT}" rev-parse HEAD)" = "${RUNTIME_SHA}"
test -z "$(git -C "${RELEASE_ROOT}" status --porcelain --untracked-files=no)"

install -d -m 700 "${BASE_DIR}" "${BRIDGE_DIR}" "${STATE_DIR}" \
  "${TRACE_DIR}" "${LOG_DIR}" "${HOME}/Library/LaunchAgents"
install -m 700 \
  "${SITE_ROOT}/scripts/agent_pilot_owner_canary_service.py" \
  "${BRIDGE_DIR}/agent_pilot_owner_canary_service.py"

if [[ ! -f "${CONFIG_PATH}" ]]; then
  BRIDGE_SECRET="$(openssl rand -hex 32)"
  umask 077
  {
    print -r -- "AGENT_PILOT_RELEASE_ROOT='${RELEASE_ROOT}'"
    print -r -- "AGENT_PILOT_EXPECTED_SHA='${RUNTIME_SHA}'"
    print -r -- "AGENT_PILOT_BRIDGE_SECRET='${BRIDGE_SECRET}'"
    print -r -- "AGENT_PILOT_STATE_DIR='${STATE_DIR}'"
    print -r -- "AGENT_PILOT_TRACE_PATH='${TRACE_DIR}/owner-turns.jsonl'"
    print -r -- "AGENT_PILOT_CODEX_TIMEOUT_SECONDS='90'"
    print -r -- "AGENT_PILOT_BIND_HOST='127.0.0.1'"
    print -r -- "AGENT_PILOT_BIND_PORT='8791'"
  } > "${CONFIG_PATH}"
fi
chmod 600 "${CONFIG_PATH}"

PLIST_TMP="$(mktemp "${BASE_DIR}/launch-agent.XXXXXX")"
cat > "${PLIST_TMP}" <<PLIST
<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE plist PUBLIC "-//Apple//DTD PLIST 1.0//EN" "http://www.apple.com/DTDs/PropertyList-1.0.dtd">
<plist version="1.0">
<dict>
  <key>Label</key><string>${LABEL}</string>
  <key>ProgramArguments</key>
  <array>
    <string>/bin/zsh</string>
    <string>-c</string>
    <string>set -a; source '${CONFIG_PATH}'; exec '${PYTHON_BIN}' '${BRIDGE_DIR}/agent_pilot_owner_canary_service.py'</string>
  </array>
  <key>RunAtLoad</key><true/>
  <key>KeepAlive</key><true/>
  <key>ProcessType</key><string>Background</string>
  <key>StandardOutPath</key><string>${LOG_DIR}/service.stdout.log</string>
  <key>StandardErrorPath</key><string>${LOG_DIR}/service.stderr.log</string>
  <key>ThrottleInterval</key><integer>10</integer>
</dict>
</plist>
PLIST
plutil -lint "${PLIST_TMP}" >/dev/null
install -m 600 "${PLIST_TMP}" "${PLIST_PATH}"
rm -f "${PLIST_TMP}"

launchctl bootout "gui/$(id -u)/${LABEL}" >/dev/null 2>&1 || true
launchctl bootstrap "gui/$(id -u)" "${PLIST_PATH}"
launchctl kickstart -k "gui/$(id -u)/${LABEL}"

for _ in {1..30}; do
  if zsh -c "set -a; source '${CONFIG_PATH}'; curl -fsS -H \"Authorization: Bearer \${AGENT_PILOT_BRIDGE_SECRET}\" http://127.0.0.1:8791/health >/dev/null"; then
    print -r -- "AGENT_PILOT_LOCAL_SERVICE=ready"
    print -r -- "AGENT_PILOT_RUNTIME_SHA=${RUNTIME_SHA}"
    print -r -- "AGENT_PILOT_CONFIG=${CONFIG_PATH}"
    print -r -- "AGENT_PILOT_TRACE=${TRACE_DIR}/owner-turns.jsonl"
    exit 0
  fi
  sleep 1
done

print -u2 -r -- "AGENT_PILOT_LOCAL_SERVICE=failed"
tail -n 40 "${LOG_DIR}/service.stderr.log" >&2 || true
exit 1
