#!/usr/bin/env bash
set -Eeuo pipefail

# Installs a systemd unit that runs DB backup before shutdown/reboot.

SERVICE_NAME="office-db-backup-before-shutdown.service"
UNIT_PATH="/etc/systemd/system/${SERVICE_NAME}"
SCRIPT_PATH_DEFAULT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)/db_backup.sh"
SCRIPT_PATH="$SCRIPT_PATH_DEFAULT"
COMPOSE_FILE=""
ENV_FILE=""
DUMP_DIR=""
DB_SERVICE=""

log() { echo "[install-shutdown-backup] $*"; }
fail() { echo "[install-shutdown-backup] ERROR: $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  sudo bash scripts/install_shutdown_db_backup.sh [options]

Options:
  --script-path <path>    Path to db_backup.sh (default: ./scripts/db_backup.sh)
  --compose-file <path>   Passed to db_backup.sh --compose-file
  --env-file <path>       Passed to db_backup.sh --env-file
  --dump-dir <path>       Passed to db_backup.sh --dump-dir
  --db-service <name>     Passed to db_backup.sh --db-service
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --script-path) SCRIPT_PATH="${2:-}"; shift 2 ;;
    --compose-file) COMPOSE_FILE="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --dump-dir) DUMP_DIR="${2:-}"; shift 2 ;;
    --db-service) DB_SERVICE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

if [[ "${EUID}" -ne 0 ]]; then
  fail "Run as root (sudo)."
fi

[[ -f "$SCRIPT_PATH" ]] || fail "Backup script not found: $SCRIPT_PATH"
chmod +x "$SCRIPT_PATH"

exec_args=("$SCRIPT_PATH")
[[ -n "$COMPOSE_FILE" ]] && exec_args+=("--compose-file" "$COMPOSE_FILE")
[[ -n "$ENV_FILE" ]] && exec_args+=("--env-file" "$ENV_FILE")
[[ -n "$DUMP_DIR" ]] && exec_args+=("--dump-dir" "$DUMP_DIR")
[[ -n "$DB_SERVICE" ]] && exec_args+=("--db-service" "$DB_SERVICE")

# shellcheck disable=SC2145
exec_start="$(printf "%q " "${exec_args[@]}")"
exec_start="${exec_start% }"

log "Writing systemd unit: $UNIT_PATH"
cat >"$UNIT_PATH" <<EOF
[Unit]
Description=Office DB backup before shutdown/reboot
DefaultDependencies=no
Before=shutdown.target reboot.target halt.target
Wants=docker.service
After=docker.service

[Service]
Type=oneshot
ExecStart=${exec_start}
TimeoutStartSec=300

[Install]
WantedBy=shutdown.target reboot.target halt.target
EOF

systemctl daemon-reload
systemctl enable "$SERVICE_NAME"

log "Installed and enabled: $SERVICE_NAME"
log "Test manually:"
log "  sudo systemctl start $SERVICE_NAME"
