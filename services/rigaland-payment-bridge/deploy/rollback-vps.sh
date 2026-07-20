#!/usr/bin/env bash
set -Eeuo pipefail

readonly SERVICE_NAME="rigaland-payment-bridge.service"
readonly APP_DIR="/opt/rigaland-payment-bridge"
readonly ACTIVE_BRIDGE="${APP_DIR}/bridge.py"
readonly BACKUP_DIR="${APP_DIR}/backups"
TEMP_BRIDGE=""

die() {
    echo "ERROR: $*" >&2
    exit 1
}

[[ "${EUID}" -eq 0 ]] || die "run this script as root"
for command_name in python3 curl systemctl install mktemp find sort awk; do
    command -v "${command_name}" >/dev/null 2>&1 || die "missing command: ${command_name}"
done

[[ -d "${BACKUP_DIR}" ]] || die "backup directory is unavailable"
LATEST_BACKUP="$(find "${BACKUP_DIR}" -maxdepth 1 -type f -name 'bridge.py.*' \
    -printf '%T@ %p\n' | sort -nr | awk 'NR == 1 {$1=""; sub(/^ /, ""); print}')"
[[ -n "${LATEST_BACKUP}" && -f "${LATEST_BACKUP}" ]] || die "no bridge.py backup found"

TEMP_BRIDGE="$(mktemp "${APP_DIR}/.bridge.py.rollback.XXXXXX")"
cleanup() {
    [[ -z "${TEMP_BRIDGE}" || ! -e "${TEMP_BRIDGE}" ]] || rm -f -- "${TEMP_BRIDGE}"
}
trap cleanup EXIT
install -o root -g root -m 0755 "${LATEST_BACKUP}" "${TEMP_BRIDGE}"
python3 -m py_compile "${TEMP_BRIDGE}"
mv -f -- "${TEMP_BRIDGE}" "${ACTIVE_BRIDGE}"
TEMP_BRIDGE=""

systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"
HTTP_STATUS=""
for _ in {1..20}; do
    HTTP_STATUS="$(curl --noproxy '*' --silent --output /dev/null --write-out '%{http_code}' \
        --connect-timeout 1 --max-time 3 \
        http://127.0.0.1:3102/rigaland/payment-bridge || true)"
    [[ "${HTTP_STATUS}" == "405" ]] && break
    sleep 0.25
done
[[ "${HTTP_STATUS}" == "405" ]] || die "rollback GET smoke check did not return 405"

echo "Rolled back only ${SERVICE_NAME} from ${LATEST_BACKUP}; GET status=405."
echo "The site, PM2, Nginx and payment endpoints were not touched."
