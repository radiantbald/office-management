#!/usr/bin/env bash
set -Eeuo pipefail

# Creates a PostgreSQL dump from the `db` service in docker compose.
# Supports both local (docker-compose.yml) and prod (docker-compose.prod.yml).

ROOT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")/.." && pwd)"
ENV_FILE="${ENV_FILE:-$ROOT_DIR/.env}"
COMPOSE_FILE="${COMPOSE_FILE:-$ROOT_DIR/docker-compose.yml}"
DUMP_DIR="${DUMP_DIR:-$ROOT_DIR/backend/db_dumps}"
DB_SERVICE="${DB_SERVICE:-db}"

log() { echo "[db-backup] $*"; }
fail() { echo "[db-backup] ERROR: $*" >&2; exit 1; }

usage() {
  cat <<'EOF'
Usage:
  bash scripts/db_backup.sh [options]

Options:
  --compose-file <path>   Compose file path (default: ./docker-compose.yml)
  --env-file <path>       Env file path (default: ./.env)
  --dump-dir <path>       Output directory (default: ./backend/db_dumps)
  --db-service <name>     DB service name in compose (default: db)
  -h, --help              Show this help
EOF
}

while [[ $# -gt 0 ]]; do
  case "$1" in
    --compose-file) COMPOSE_FILE="${2:-}"; shift 2 ;;
    --env-file) ENV_FILE="${2:-}"; shift 2 ;;
    --dump-dir) DUMP_DIR="${2:-}"; shift 2 ;;
    --db-service) DB_SERVICE="${2:-}"; shift 2 ;;
    -h|--help) usage; exit 0 ;;
    *) fail "Unknown argument: $1" ;;
  esac
done

[[ -f "$COMPOSE_FILE" ]] || fail "Compose file not found: $COMPOSE_FILE"
[[ -f "$ENV_FILE" ]] || fail "Env file not found: $ENV_FILE"

mkdir -p "$DUMP_DIR"

set -a
# shellcheck disable=SC1090
source "$ENV_FILE"
set +a

[[ -n "${POSTGRES_USER:-}" ]] || fail "POSTGRES_USER is empty in env file"
[[ -n "${POSTGRES_DB:-}" ]] || fail "POSTGRES_DB is empty in env file"

timestamp="$(date +%Y%m%d_%H%M%S)"
dump_file="$DUMP_DIR/db_dump_${timestamp}.sql"

log "Creating dump to $dump_file"
docker compose -f "$COMPOSE_FILE" --env-file "$ENV_FILE" exec -T "$DB_SERVICE" \
  pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" > "$dump_file"

size="$(wc -c < "$dump_file" || true)"
log "Done (bytes: ${size:-unknown})"
