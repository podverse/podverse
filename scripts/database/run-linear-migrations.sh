#!/usr/bin/env bash
# Run forward-only linear migrations for app or management database.
#
# Usage:
#   ./scripts/database/run-linear-migrations.sh --database app
#   ./scripts/database/run-linear-migrations.sh --database management --dry-run

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

DATABASE=""
DRY_RUN=false
MIGRATIONS_DIR=""
PSQL_USER=""
PSQL_PASSWORD=""
PSQL_DB=""
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
ENV_FILE="$REPO_ROOT/infra/config/local/db.env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--database)
      DATABASE="$2"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 --database <app|management> [--dry-run]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --database <app|management> [--dry-run]"
      exit 1
      ;;
  esac
done

if [[ -z "$DATABASE" ]]; then
  echo "Missing required --database <app|management> argument."
  echo "Usage: $0 --database <app|management> [--dry-run]"
  exit 1
fi

if [[ "$DATABASE" != "app" && "$DATABASE" != "management" ]]; then
  echo "Database must be one of: app, management"
  exit 1
fi

if [[ -z "${DB_USER:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_NAME:-}" ]]; then
  if [[ -f "$ENV_FILE" ]]; then
    # shellcheck disable=SC1090
    source "$ENV_FILE"
  fi
fi

if [[ "$DATABASE" == "app" ]]; then
  MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/db/source/app"
  PSQL_USER="${DB_USER:-${DB_APP_ADMIN_USER:-}}"
  PSQL_PASSWORD="${DB_PASSWORD:-${DB_APP_ADMIN_PASSWORD:-}}"
  PSQL_DB="${DB_NAME:-${DB_APP_NAME:-podverse_app}}"
  LOCK_KEY="951001"
else
  MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/db/source/management"
  PSQL_USER="${DB_USER:-${DB_MANAGEMENT_ADMIN_USER:-}}"
  PSQL_PASSWORD="${DB_PASSWORD:-${DB_MANAGEMENT_ADMIN_PASSWORD:-}}"
  PSQL_DB="${DB_NAME:-${DB_MANAGEMENT_NAME:-podverse_management}}"
  LOCK_KEY="951002"
fi

if [[ -z "$PSQL_USER" || -z "$PSQL_PASSWORD" || -z "$PSQL_DB" ]]; then
  echo "Missing DB credentials. Provide DB_USER/DB_PASSWORD/DB_NAME or local db.env values."
  exit 1
fi

if [[ ! -d "$MIGRATIONS_DIR" ]]; then
  echo "Migration directory not found: $MIGRATIONS_DIR"
  exit 1
fi

mapfile -t migration_files < <(printf '%s\n' "$MIGRATIONS_DIR"/*.sql | sort)
if ((${#migration_files[@]} == 0)); then
  echo "No migration files found in $MIGRATIONS_DIR"
  exit 0
fi

sql_exec() {
  local sql="$1"
  PGPASSWORD="$PSQL_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$PSQL_USER" -d "$PSQL_DB" -v ON_ERROR_STOP=1 -t -A -c "$sql"
}

sql_exec_file_and_record_in_tx() {
  local sql_file="$1"
  local migration_filename="$2"
  local migration_checksum="$3"
  local escaped_filename escaped_checksum

  escaped_filename="${migration_filename//\'/\'\'}"
  escaped_checksum="${migration_checksum//\'/\'\'}"

  {
    echo "BEGIN;"
    # Same connection/transaction as migration SQL; session lock + unlock across separate psql -c was invalid and caused ExclusiveLock warnings.
    echo "SELECT pg_advisory_xact_lock($LOCK_KEY);"
    cat "$sql_file"
    printf "INSERT INTO linear_migration_history (migration_filename, migration_checksum) VALUES ('%s', '%s');\n" "$escaped_filename" "$escaped_checksum"
    echo "COMMIT;"
  } | PGPASSWORD="$PSQL_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$PSQL_USER" -d "$PSQL_DB" -v ON_ERROR_STOP=1
}

compute_sha256() {
  local target_file="$1"
  if command -v sha256sum >/dev/null 2>&1; then
    sha256sum "$target_file" | awk '{print $1}'
    return
  fi

  if command -v shasum >/dev/null 2>&1; then
    shasum -a 256 "$target_file" | awk '{print $1}'
    return
  fi

  echo "No sha256 checksum command available (need sha256sum or shasum)." >&2
  exit 1
}

sql_exec "CREATE TABLE IF NOT EXISTS linear_migration_history (id SERIAL PRIMARY KEY, migration_filename VARCHAR(255) NOT NULL UNIQUE, migration_checksum VARCHAR(64) NOT NULL, applied_at TIMESTAMPTZ NOT NULL DEFAULT NOW());" >/dev/null
sql_exec "CREATE INDEX IF NOT EXISTS idx_linear_migration_history_applied_at ON linear_migration_history(applied_at DESC);" >/dev/null

echo "Database: $DATABASE"
echo "Host: $DB_HOST:$DB_PORT"
echo "Schema DB: $PSQL_DB"
echo "Migrations directory: $MIGRATIONS_DIR"
echo ""

for migration_path in "${migration_files[@]}"; do
  migration_filename="$(basename "$migration_path")"
  migration_checksum="$(compute_sha256 "$migration_path")"
  escaped_filename="${migration_filename//\'/\'\'}"

  existing_checksum="$(sql_exec "SELECT migration_checksum FROM linear_migration_history WHERE migration_filename = '$escaped_filename' LIMIT 1;")"

  if [[ -n "$existing_checksum" ]]; then
    if [[ "$existing_checksum" != "$migration_checksum" ]]; then
      echo "Checksum mismatch for already-applied migration: $migration_filename"
      echo "Expected: $existing_checksum"
      echo "Actual:   $migration_checksum"
      exit 1
    fi
    echo "SKIP $migration_filename (already applied)"
    continue
  fi

  if [[ "$DRY_RUN" == true ]]; then
    echo "PENDING $migration_filename"
    continue
  fi

  echo "APPLY $migration_filename"
  {
    sql_exec_file_and_record_in_tx "$migration_path" "$migration_filename" "$migration_checksum"
  } || {
    echo "Failed applying migration: $migration_filename"
    exit 1
  }
done

if [[ "$DRY_RUN" == true ]]; then
  echo ""
  echo "Dry-run completed."
else
  echo ""
  echo "Linear migration run completed."
fi
