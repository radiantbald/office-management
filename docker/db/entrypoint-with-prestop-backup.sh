#!/usr/bin/env bash
set -Eeuo pipefail

DUMP_DIR="${DB_DUMP_DIR:-/db_dumps}"
DUMP_TAG="${DB_DUMP_TAG:-auto_on_db_stop}"
POSTGRES_PROC_PID=""
BACKUP_DONE="false"

log() {
  echo "[db-prestop-backup] $*"
}

create_dump() {
  if [[ "${DB_DUMP_ON_STOP:-true}" != "true" ]]; then
    log "Skip backup: DB_DUMP_ON_STOP is not true"
    return 0
  fi
  if [[ "$BACKUP_DONE" == "true" ]]; then
    return 0
  fi
  if [[ -z "${POSTGRES_USER:-}" || -z "${POSTGRES_DB:-}" ]]; then
    log "Skip backup: POSTGRES_USER or POSTGRES_DB is empty"
    BACKUP_DONE="true"
    return 0
  fi

  mkdir -p "$DUMP_DIR"
  local ts dump_file
  ts="$(date +%Y%m%d_%H%M%S)"
  dump_file="${DUMP_DIR}/db_dump_${DUMP_TAG}_${ts}.sql"

  if ! pg_isready -U "$POSTGRES_USER" -d "$POSTGRES_DB" >/dev/null 2>&1; then
    log "Skip backup: postgres is not ready"
    BACKUP_DONE="true"
    return 0
  fi

  log "Creating dump: $dump_file"
  if pg_dump -U "$POSTGRES_USER" "$POSTGRES_DB" >"$dump_file"; then
    log "Dump created successfully"
    BACKUP_DONE="true"
    return 0
  fi

  rm -f "$dump_file" || true
  log "Dump failed"
  BACKUP_DONE="true"
  return 1
}

handle_stop_signal() {
  log "Stop signal received, running pre-stop backup"
  create_dump || true

  if [[ -n "$POSTGRES_PROC_PID" ]] && kill -0 "$POSTGRES_PROC_PID" >/dev/null 2>&1; then
    kill -TERM "$POSTGRES_PROC_PID" >/dev/null 2>&1 || true
    wait "$POSTGRES_PROC_PID" || true
  fi
  exit 0
}

trap handle_stop_signal TERM INT

# Start upstream postgres entrypoint in background so we can intercept stop signals.
/usr/local/bin/docker-entrypoint.sh postgres &
POSTGRES_PROC_PID="$!"
wait "$POSTGRES_PROC_PID"
