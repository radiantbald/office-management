#!/usr/bin/env bash
set -Eeuo pipefail

# Runs DB dump before stop/restart of docker compose DB service.
# Use this script instead of direct `docker compose stop db` / `restart db`
# when you need an automatic backup.

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
DUMP_DIR="${DUMP_DIR:-$ROOT_DIR/backend/db_dumps}"
DB_SERVICE="${DB_SERVICE:-db}"
BACKUP_SCRIPT="${BACKUP_SCRIPT:-$ROOT_DIR/scripts/db_backup.sh}"
ACTION=""
DUMP_TAG=""

log() { echo "[db-control] $*"; }
fail() { echo "[db-control] ERROR: $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  bash scripts/db_container_control.sh --action <stop|restart> [options]

Options:
  --action <stop|restart>  Container action for DB service (required)
  --compose-file <path>    Compose file path (default: ./docker-compose.yml)
  --env-file <path>        Env file path (default: ./.env)
  --dump-dir <path>        Output directory for dump (default: ./backend/db_dumps)
  --db-service <name>      DB service name in compose (default: db)
  --backup-script <path>   Path to db_backup.sh (default: ./scripts/db_backup.sh)
  --tag <value>            Explicit tag for dump name
  -h, --help               Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --action) ACTION="${2:-}"; shift 2 ;;
    --compose-file) COMPOSE_FILE="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --dump-dir) DUMP_DIR="${2:-}"; shift 2 ;;
    --db-service) DB_SERVICE="${2:-}"; shift 2 ;;
    --backup-script) BACKUP_SCRIPT="${2:-}"; shift 2 ;;
    --tag) DUMP_TAG="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Env file not found: $ENV_FILE"
[[ -f "$BACKUP_SCRIPT" ]] || fail "Backup script not found: $BACKUP_SCRIPT"
[[ -n "$ACTION" ]] || fail "--action is required (stop|restart)"

case "$ACTION" in
  stop|restart) ;;
  *) fail "--action must be stop or restart" ;;
esac

if [[ -z "$DUMP_TAG" ]]; then
  DUMP_TAG="auto_before_${ACTION}"
fi

log "Creating dump before '$ACTION' of service '$DB_SERVICE'"
bash "$BACKUP_SCRIPT" \
  --compose-file "$COMPOSE_FILE" \
  --env-file "$ENV_FILE" \
  --dump-dir "$DUMP_DIR" \
  --db-service "$DB_SERVICE" \
  --tag "$DUMP_TAG"

log "Running docker compose $ACTION $DB_SERVICE"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" "$ACTION" "$DB_SERVICE"

log "Done"
