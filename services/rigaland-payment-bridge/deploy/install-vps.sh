#!/usr/bin/env bash
set -Eeuo pipefail

readonly SERVICE_NAME="rigaland-payment-bridge.service"
readonly SERVICE_USER="rigaland-bridge"
readonly SERVICE_GROUP="rigaland-bridge"
readonly APP_DIR="/opt/rigaland-payment-bridge"
readonly STATE_DIR="/var/lib/rigaland-payment-bridge"
readonly UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}"
readonly NGINX_SNIPPET_PATH="/etc/nginx/snippets/rigaland-payment-bridge.conf"
readonly EXPECTED_BRIDGE_SHA256="9876592bf3dc8d8a02e697a42e61089f150200655bf93962f7cc7893fec2df2a"

SCRIPT_DIR="$(cd -- "$(dirname -- "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_DIR="$(cd -- "${SCRIPT_DIR}/.." && pwd)"
INSTALL_NGINX_SNIPPET=false
TEMP_BRIDGE=""

cleanup() {
    if [[ -n "${TEMP_BRIDGE}" && -e "${TEMP_BRIDGE}" ]]; then
        rm -f -- "${TEMP_BRIDGE}"
    fi
}
trap cleanup EXIT

die() {
    echo "ERROR: $*" >&2
    exit 1
}

usage() {
    cat <<'EOF'
Usage: sudo bash deploy/install-vps.sh [--install-nginx-snippet]

Without the optional flag, Nginx is not changed. The flag only installs the
standalone snippet; it does not edit a server block and does not reload Nginx.
EOF
}

for argument in "$@"; do
    case "${argument}" in
        --install-nginx-snippet)
            INSTALL_NGINX_SNIPPET=true
            ;;
        -h|--help)
            usage
            exit 0
            ;;
        *)
            usage >&2
            die "unsupported argument: ${argument}"
            ;;
    esac
done

[[ "${EUID}" -eq 0 ]] || die "run this script as root"
[[ "$(uname -s)" == "Linux" ]] || die "Linux is required"
[[ -r /etc/os-release ]] || die "/etc/os-release is unavailable"
# shellcheck disable=SC1091
source /etc/os-release
[[ "${ID:-}" == "ubuntu" ]] || die "Ubuntu is required"

for command_name in python3 curl sqlite3 sha256sum systemctl getent groupadd useradd install mktemp; do
    command -v "${command_name}" >/dev/null 2>&1 || die "missing command: ${command_name}"
done

SOURCE_BRIDGE="${PROJECT_DIR}/bridge.py"
SOURCE_UNIT="${SCRIPT_DIR}/rigaland-payment-bridge.service"
SOURCE_NGINX_SNIPPET="${SCRIPT_DIR}/nginx-rigaland-payment-bridge.conf"
[[ -f "${SOURCE_BRIDGE}" ]] || die "bridge.py is unavailable"
[[ -f "${SOURCE_UNIT}" ]] || die "systemd unit is unavailable"

SOURCE_SHA256="$(sha256sum "${SOURCE_BRIDGE}" | awk '{print $1}')"
[[ "${SOURCE_SHA256}" == "${EXPECTED_BRIDGE_SHA256}" ]] || die "unexpected bridge.py SHA-256"
python3 -m py_compile "${SOURCE_BRIDGE}"

if ! getent group "${SERVICE_GROUP}" >/dev/null; then
    groupadd --system "${SERVICE_GROUP}"
fi
if ! id -u "${SERVICE_USER}" >/dev/null 2>&1; then
    useradd \
        --system \
        --gid "${SERVICE_GROUP}" \
        --home-dir /nonexistent \
        --no-create-home \
        --shell /usr/sbin/nologin \
        "${SERVICE_USER}"
fi

install -d -o root -g root -m 0755 "${APP_DIR}"
install -d -o root -g root -m 0700 "${APP_DIR}/backups"
install -d -o "${SERVICE_USER}" -g "${SERVICE_GROUP}" -m 0700 "${STATE_DIR}"

TEMP_BRIDGE="$(mktemp "${APP_DIR}/.bridge.py.install.XXXXXX")"
install -o root -g root -m 0755 "${SOURCE_BRIDGE}" "${TEMP_BRIDGE}"
python3 -m py_compile "${TEMP_BRIDGE}"
mv -f -- "${TEMP_BRIDGE}" "${APP_DIR}/bridge.py"
TEMP_BRIDGE=""

install -o root -g root -m 0644 "${SOURCE_UNIT}" "${UNIT_PATH}"

if [[ "${INSTALL_NGINX_SNIPPET}" == true ]]; then
    [[ -f "${SOURCE_NGINX_SNIPPET}" ]] || die "Nginx snippet is unavailable"
    install -d -o root -g root -m 0755 /etc/nginx/snippets
    install -o root -g root -m 0644 "${SOURCE_NGINX_SNIPPET}" "${NGINX_SNIPPET_PATH}"
    echo "Nginx snippet installed but not included or reloaded: ${NGINX_SNIPPET_PATH}"
fi

systemctl daemon-reload
systemctl enable --now "${SERVICE_NAME}"

HTTP_STATUS=""
for _ in {1..20}; do
    HTTP_STATUS="$(curl --noproxy '*' --silent --output /dev/null --write-out '%{http_code}' \
        --connect-timeout 1 --max-time 3 \
        http://127.0.0.1:3102/rigaland/payment-bridge || true)"
    [[ "${HTTP_STATUS}" == "405" ]] && break
    sleep 0.25
done

[[ "${HTTP_STATUS}" == "405" ]] || die "bridge GET smoke check did not return 405"
systemctl is-active --quiet "${SERVICE_NAME}" || die "bridge service is not active"

echo "Installed ${SERVICE_NAME}; GET smoke status=${HTTP_STATUS}; no payment POST was sent."
