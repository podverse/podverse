#!/usr/bin/env bash
# Rebuild generated linear baseline archives from bootstrap 0001 + 0002, then the full
# linear app + management migration chains, then pg_dump of each database (separate files).
# Default outputs:
#   infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
#   infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz
# Pass a directory as the first argument to write both files there (for verify-linear-baseline.sh).
# Pass a path ending in .sql for uncompressed combined debug output (legacy).
# Do not edit 0003a/0003b manually; re-run this script or `make db_regen_linear_baseline` after migration changes.
#
# Requires: docker, gzip (when writing .gz), a POSIX shell
#
# Usage: ./scripts/database/generate-linear-baseline.sh [output_dir | combined.sql]

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
set -a
# shellcheck source=scripts/database/db.generate-baseline.env
source "$SCRIPT_DIR/db.generate-baseline.env"
set +a

export REPO_ROOT
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-5432}"

DEFAULT_OUT_DIR="$REPO_ROOT/infra/k8s/base/db/source/bootstrap"
OUT_APP_REL="0003a_app_linear_baseline.sql.gz"
OUT_MGT_REL="0003b_management_linear_baseline.sql.gz"

FIRST_ARG="${1:-}"
OUT_DIR="$DEFAULT_OUT_DIR"
COMBINED_SQL_DEBUG=""
if [[ -n "$FIRST_ARG" ]]; then
  if [[ -d "$FIRST_ARG" ]]; then
    OUT_DIR="$(cd "$FIRST_ARG" && pwd)"
  elif [[ "$FIRST_ARG" == *.sql ]]; then
    COMBINED_SQL_DEBUG="$FIRST_ARG"
    if [[ "$COMBINED_SQL_DEBUG" != /* ]]; then
      COMBINED_SQL_DEBUG="$REPO_ROOT/$COMBINED_SQL_DEBUG"
    fi
  else
    echo "Usage: $0 [output_directory | path/to/debug.sql]" >&2
    exit 1
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to generate the linear baseline." >&2
  exit 1
fi

CONTAINER_NAME="podverse-linear-baseline-$$"
APP_DUMP="$(mktemp)"
MGT_DUMP="$(mktemp)"
TMP_APP_SQL="$(mktemp)"
TMP_MGT_SQL="$(mktemp)"
cleanup() {
  rm -f "$APP_DUMP" "$MGT_DUMP" "$TMP_APP_SQL" "$TMP_MGT_SQL" 2>/dev/null || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

APP_MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/app"
MGT_MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/management"

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

sql_escape_literal() {
  local s="$1"
  s="${s//\'/\'\'}"
  printf '%s' "$s"
}

append_history_seed_block() {
  local db_label="$1"
  local migrations_dir="$2"
  local out_file="$3"
  local -a files=("$migrations_dir"/*.sql)

  if [[ "${#files[@]}" -eq 0 ]]; then
    echo "No migration files found in $migrations_dir" >&2
    exit 1
  fi

  {
    printf '\n'
    printf '%s\n' "-- ${db_label} linear migration history"
    printf '%s\n' "INSERT INTO public.linear_migration_history (migration_filename, migration_checksum) VALUES"
  } >>"$out_file"

  local index=0
  local total="${#files[@]}"
  local path filename checksum esc_fn esc_sum suffix

  for path in "${files[@]}"; do
    filename="$(basename "$path")"
    checksum="$(compute_sha256 "$path")"
    esc_fn="$(sql_escape_literal "$filename")"
    esc_sum="$(sql_escape_literal "$checksum")"
    suffix=","
    if [[ "$index" -eq $((total - 1)) ]]; then
      suffix=""
    fi

    printf "  ('%s', '%s')%s\n" "$esc_fn" "$esc_sum" "$suffix" >>"$out_file"
    index=$((index + 1))
  done

  printf '%s\n' "ON CONFLICT (migration_filename) DO NOTHING;" >>"$out_file"
}

# shellcheck disable=SC2016
docker run -d --name "$CONTAINER_NAME" \
  -v "$REPO_ROOT:/work" \
  -e "POSTGRES_USER=$DB_APP_OWNER_USER" \
  -e "POSTGRES_PASSWORD=$DB_APP_OWNER_PASSWORD" \
  -e "POSTGRES_DB=$DB_APP_NAME" \
  postgres:18.3

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_APP_OWNER_USER" -d "$DB_APP_NAME" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# shellcheck disable=SC2016,SC1091,SC2029
docker exec -i "$CONTAINER_NAME" bash -s <<'INNER'
set -euo pipefail
set -a
# shellcheck disable=SC1090
source /work/scripts/database/db.generate-baseline.env
set +a
export REPO_ROOT=/work
export DB_HOST=127.0.0.1
export DB_PORT=5432
cd /work
bash /work/infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh
bash /work/infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
bash /work/scripts/database/run-linear-migrations.sh --database app
bash /work/scripts/database/run-linear-migrations.sh --database management

normalize_seed_timestamps() {
  local user="$1"
  local password="$2"
  local db="$3"
  PGPASSWORD="$password" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" <<'SQL'
SET session_replication_role = replica;

DO $$
DECLARE
  table_row RECORD;
BEGIN
  FOR table_row IN
    SELECT created_col.table_schema, created_col.table_name
    FROM information_schema.columns created_col
    INNER JOIN information_schema.columns updated_col
      ON created_col.table_schema = updated_col.table_schema
     AND created_col.table_name = updated_col.table_name
    WHERE created_col.table_schema = 'public'
      AND created_col.column_name = 'created_at'
      AND updated_col.column_name = 'updated_at'
  LOOP
    EXECUTE format(
      'UPDATE %I.%I SET created_at = %L, updated_at = %L WHERE created_at IS NOT NULL OR updated_at IS NOT NULL;',
      table_row.table_schema,
      table_row.table_name,
      '2000-01-01 00:00:00+00',
      '2000-01-01 00:00:00+00'
    );
  END LOOP;
END
$$;

SET session_replication_role = origin;
SQL
}

normalize_seed_timestamps "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_APP_NAME"
normalize_seed_timestamps "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_MANAGEMENT_NAME"
INNER

# shellcheck disable=SC2016,SC2029
docker exec -e "PGPASSWORD=$DB_APP_MIGRATOR_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -h 127.0.0.1 -p 5432 -U "$DB_APP_MIGRATOR_USER" -d "$DB_APP_NAME" \
  --no-owner --exclude-table-data=linear_migration_history > "$APP_DUMP"

# shellcheck disable=SC2016,SC2029
docker exec -e "PGPASSWORD=$DB_MANAGEMENT_MIGRATOR_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -h 127.0.0.1 -p 5432 -U "$DB_MANAGEMENT_MIGRATOR_USER" -d "$DB_MANAGEMENT_NAME" \
  --no-owner --exclude-table-data=linear_migration_history > "$MGT_DUMP"

for f in "$APP_DUMP" "$MGT_DUMP"; do
  if grep -qE '^\\(un)?restrict ' "$f" 2>/dev/null; then
    sed -E '/^\\(un)?restrict /d' "$f" > "${f}.sedtmp" && mv "${f}.sedtmp" "$f"
  fi
done

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-baseline.sh and docs/operations/database/LINEAR-MIGRATIONS.md" ""
  printf '%s\n' "-- App database baseline (schema + migration-materialized data; applied as DB_APP_MIGRATOR_USER)." ""
  printf '%s\n' "-- linear_migration_history data is appended deterministically from migration filenames + checksums." ""
  cat "$APP_DUMP"
  printf '\n'
} >"$TMP_APP_SQL"
append_history_seed_block "App database" "$APP_MIGRATIONS_DIR" "$TMP_APP_SQL"

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-baseline.sh and docs/operations/database/LINEAR-MIGRATIONS.md" ""
  printf '%s\n' "-- Management database baseline (schema + migration-materialized data; applied as DB_MANAGEMENT_MIGRATOR_USER)." ""
  printf '%s\n' "-- linear_migration_history data is appended deterministically from migration filenames + checksums." ""
  cat "$MGT_DUMP"
  printf '\n'
} >"$TMP_MGT_SQL"
append_history_seed_block "Management database" "$MGT_MIGRATIONS_DIR" "$TMP_MGT_SQL"

if [[ -n "$COMBINED_SQL_DEBUG" ]]; then
  {
    printf '%s\n' "-- GENERATED DEBUG (combined)" ""
    printf "%s\n" "\\connect $DB_APP_NAME" ""
    cat "$TMP_APP_SQL"
    printf '\n'
    printf "%s\n" "\\connect $DB_MANAGEMENT_NAME" ""
    cat "$TMP_MGT_SQL"
    printf '\n'
  } >"$COMBINED_SQL_DEBUG"
  echo "Wrote debug SQL: $COMBINED_SQL_DEBUG"
fi

mkdir -p "$OUT_DIR"
if ! command -v gzip >/dev/null 2>&1; then
  echo "gzip is required to write compressed baseline (.sql.gz)." >&2
  exit 1
fi
gzip -nc <"$TMP_APP_SQL" >"$OUT_DIR/$OUT_APP_REL"
gzip -nc <"$TMP_MGT_SQL" >"$OUT_DIR/$OUT_MGT_REL"

echo "Wrote: $OUT_DIR/$OUT_APP_REL"
echo "Wrote: $OUT_DIR/$OUT_MGT_REL"
