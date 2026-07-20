#!/usr/bin/env bash
set -Eeuo pipefail

readonly SERVICE_NAME="rigaland-payment-bridge.service"
readonly APP_DIR="/opt/rigaland-payment-bridge"
readonly BACKUP_DIR="${APP_DIR}/backups"
readonly EXPECTED_BRIDGE_SHA256="68b40179f647cdaf530680aa4701c7ff9482940b8724c6290002cab202e41b2a"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
ACTIVE_BRIDGE="${APP_DIR}/bridge.py"
SOURCE_BRIDGE="${PROJECT_DIR}/bridge.py"
BACKUP_PATH=""
TEMP_BRIDGE=""
ROLLBACK_ARMED=false

die() {
    echo "ERROR: $*" >&2
    exit 1
}

smoke_get() {
    local status=""
    for _ in {1..20}; do
        status="$(curl --noproxy '*' --silent --output /dev/null --write-out '%{http_code}' \
            --connect-timeout 1 --max-time 3 \
            http://127.0.0.1:3102/rigaland/payment-bridge || true)"
        [[ "${status}" == "405" ]] && return 0
        sleep 0.25
    done
    return 1
}

cleanup_or_rollback() {
    local exit_code=$?
    trap - EXIT
    set +e
    if [[ "${exit_code}" -ne 0 && "${ROLLBACK_ARMED}" == true && -n "${BACKUP_PATH}" && -f "${BACKUP_PATH}" ]]; then
        echo "Update failed; restoring ${BACKUP_PATH}" >&2
        local rollback_temp
        rollback_temp="$(mktemp "${APP_DIR}/.bridge.py.rollback.XXXXXX")"
        install -o root -g root -m 0755 "${BACKUP_PATH}" "${rollback_temp}"
        mv -f -- "${rollback_temp}" "${ACTIVE_BRIDGE}"
        systemctl restart "${SERVICE_NAME}"
        if smoke_get; then
            echo "Automatic rollback completed; GET status=405." >&2
        else
            echo "Automatic rollback completed, but the GET smoke check failed." >&2
        fi
    fi
    [[ -z "${TEMP_BRIDGE}" || ! -e "${TEMP_BRIDGE}" ]] || rm -f -- "${TEMP_BRIDGE}"
    exit "${exit_code}"
}
trap cleanup_or_rollback EXIT

[[ "${EUID}" -eq 0 ]] || die "run this script as root"
[[ "$(uname -s)" == "Linux" ]] || die "Linux is required"
[[ -r /etc/os-release ]] || die "/etc/os-release is unavailable"
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "Ubuntu is required"

for command_name in python3 curl sha256sum systemctl install mktemp; do
    command -v "${command_name}" >/dev/null 2>&1 || die "missing command: ${command_name}"
done
[[ -f "${SOURCE_BRIDGE}" ]] || die "source bridge.py is unavailable"
[[ -f "${ACTIVE_BRIDGE}" ]] || die "active bridge.py is unavailable"

SOURCE_SHA256="$(sha256sum "${SOURCE_BRIDGE}" | awk '{print $1}')"
[[ "${SOURCE_SHA256}" == "${EXPECTED_BRIDGE_SHA256}" ]] || die "unexpected source bridge.py SHA-256"

cd "${PROJECT_DIR}"
PYTHONPATH=. python3 -m unittest discover -s tests -p 'test_bridge.py' -v
python3 -m py_compile "${SOURCE_BRIDGE}"
if command -v node >/dev/null 2>&1; then
    node tests/test_pubpay.js
    PUBPAY_HTML="${PROJECT_DIR}/ph-parking/pubpay.vps.html" \
        EXPECTED_BRIDGE_URL="https://xn--80aukedde.xn--p1ai/rigaland/payment-bridge" \
        node tests/test_pubpay.js
else
    echo "Node.js is not installed; pubpay tests are skipped because this script updates bridge.py only." >&2
fi

install -d -o root -g root -m 0700 "${BACKUP_DIR}"
BACKUP_PATH="${BACKUP_DIR}/bridge.py.$(date -u +%Y%m%dT%H%M%SZ).$$"
install -o root -g root -m 0755 "${ACTIVE_BRIDGE}" "${BACKUP_PATH}"
ROLLBACK_ARMED=true

TEMP_BRIDGE="$(mktemp "${APP_DIR}/.bridge.py.update.XXXXXX")"
install -o root -g root -m 0755 "${SOURCE_BRIDGE}" "${TEMP_BRIDGE}"
python3 -m py_compile "${TEMP_BRIDGE}"
mv -f -- "${TEMP_BRIDGE}" "${ACTIVE_BRIDGE}"
TEMP_BRIDGE=""

INSTALLED_SHA256="$(sha256sum "${ACTIVE_BRIDGE}" | awk '{print $1}')"
[[ "${INSTALLED_SHA256}" == "${EXPECTED_BRIDGE_SHA256}" ]] || die "installed bridge.py SHA-256 mismatch"

systemctl restart "${SERVICE_NAME}"
systemctl is-active --quiet "${SERVICE_NAME}"
smoke_get

ROLLBACK_ARMED=false
echo "Updated only ${SERVICE_NAME}; backup=${BACKUP_PATH}; GET status=405; no payment POST was sent."
