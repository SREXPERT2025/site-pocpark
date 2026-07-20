#!/usr/bin/env bash
set -Eeuo pipefail

readonly SERVICE_NAME="rigaland-payment-bridge.service"
readonly SERVICE_USER="rigaland-bridge"
readonly STATE_DB="/var/lib/rigaland-payment-bridge/state.sqlite3"

die() {
    echo "ERROR: $*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || die "run this script as root"
for command_name in systemctl journalctl ss curl sqlite3 runuser ip; do
    command -v "${command_name}" >/dev/null 2>&1 || die "missing command: ${command_name}"
done

systemctl --no-pager --full status "${SERVICE_NAME}" || true
JOURNAL_OUTPUT="$(journalctl -u "${SERVICE_NAME}" -n 80 --no-pager)"
printf '%s\n' "${JOURNAL_OUTPUT}"
systemctl is-active --quiet "${SERVICE_NAME}" || die "bridge service is not active"

START_LOG="$(journalctl -u "${SERVICE_NAME}" -b --no-pager | grep -F 'event=bridge_started' | tail -n 1 || true)"
grep -F "transport=curl" <<<"${START_LOG}" | grep -F "http09_allowed=true" >/dev/null \
    || die "journal does not confirm transport=curl and http09_allowed=true"

mapfile -t LISTEN_ADDRESSES < <(ss -H -ltnp 'sport = :3102' | awk '{print $4}')
[[ "${#LISTEN_ADDRESSES[@]}" -gt 0 ]] || die "port 3102 is not listening"
for listen_address in "${LISTEN_ADDRESSES[@]}"; do
    [[ "${listen_address}" == "127.0.0.1:3102" ]] \
        || die "port 3102 has a non-loopback listener: ${listen_address}"
done

HTTP_STATUS="$(curl --noproxy '*' --silent --output /dev/null --write-out '%{http_code}' \
    --connect-timeout 1 --max-time 3 \
    http://127.0.0.1:3102/rigaland/payment-bridge)"
[[ "${HTTP_STATUS}" == "405" ]] || die "bridge GET smoke check did not return 405"

[[ -f "${STATE_DB}" ]] || die "SQLite state DB is unavailable"
runuser -u "${SERVICE_USER}" -- test -r "${STATE_DB}" || die "service user cannot read SQLite DB"
runuser -u "${SERVICE_USER}" -- test -w "${STATE_DB}" || die "service user cannot write SQLite DB"
DB_CHECK="$(runuser -u "${SERVICE_USER}" -- sqlite3 -readonly "${STATE_DB}" 'PRAGMA integrity_check;')"
[[ "${DB_CHECK}" == "ok" ]] || die "SQLite integrity check failed"

mapfile -t HOST_ADDRESSES < <(ip -o -4 addr show scope global | awk '{split($4, parts, "/"); print parts[1]}')
for host_address in "${HOST_ADDRESSES[@]}"; do
    if curl --noproxy '*' --silent --output /dev/null \
        --connect-timeout 1 --max-time 2 \
        "http://${host_address}:3102/rigaland/payment-bridge"; then
        die "port 3102 is reachable through non-loopback address ${host_address}"
    fi
done

echo "VPS checks passed: loopback-only 3102, curl/http09 enabled, GET=405, SQLite accessible."
echo "No payment POST was sent."
