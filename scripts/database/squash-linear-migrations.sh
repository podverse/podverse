#!/usr/bin/env bash
# One-time (or repeat) squash helper: materialize 0001_*_schema.sql from the current
# multi-file linear chain without concatenating evolutionary migrations.
#
# Algorithm per database:
#   1. Bootstrap roles (0001/0002 shell scripts)
#   2. Apply 0000_init_helpers.sql via psql
#   3. Apply remaining NNNN_*.sql files via run-linear-migrations.sh (temp dir, excludes 0000)
#   4. normalize_seed_timestamps (deterministic reference data)
#   5. pg_dump public tables/views (excludes linear_migration_history table entirely)
#
# Usage (from repo root):
#   ./scripts/database/squash-linear-migrations.sh [--write]
#
# Without --write, prints candidate paths under .artifacts/squash-linear-migrations/
# With --write, overwrites:
#   infra/k8s/base/ops/source/database/linear-migrations/app/0001_app_schema.sql
#   infra/k8s/base/ops/source/database/linear-migrations/management/0001_management_schema.sql
#
# Requires: docker

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
set -a
# shellcheck source=scripts/database/db.generate-baseline.env
source "$SCRIPT_DIR/db.generate-baseline.env"
set +a

WRITE=false
if [[ "${1:-}" == "--write" ]]; then
  WRITE=true
elif [[ -n "${1:-}" ]]; then
  echo "Usage: $0 [--write]" >&2
  exit 1
fi

APP_MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/app"
MGT_MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/management"
ARTIFACT_DIR="$REPO_ROOT/.artifacts/squash-linear-migrations"
APP_OUT="$ARTIFACT_DIR/0001_app_schema.sql"
MGT_OUT="$ARTIFACT_DIR/0001_management_schema.sql"

if [[ "$WRITE" == true ]]; then
  APP_OUT="$APP_MIGRATIONS_DIR/0001_app_schema.sql"
  MGT_OUT="$MGT_MIGRATIONS_DIR/0001_management_schema.sql"
fi

mkdir -p "$ARTIFACT_DIR"

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required." >&2
  exit 1
fi

CONTAINER_NAME="podverse-squash-linear-$$"
cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

docker run -d --name "$CONTAINER_NAME" \
  -v "$REPO_ROOT:/work" \
  -e "POSTGRES_USER=$DB_APP_OWNER_USER" \
  -e "POSTGRES_PASSWORD=$DB_APP_OWNER_PASSWORD" \
  -e "POSTGRES_DB=$DB_APP_NAME" \
  postgres:18.3 >/dev/null

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

prepare_rest_migrations() {
  local src_dir="$1"
  local dest_dir="$2"
  rm -rf "$dest_dir"
  mkdir -p "$dest_dir"
  local path base
  for path in "$src_dir"/*.sql; do
    base="$(basename "$path")"
    if [[ "$base" == "0000_init_helpers.sql" ]]; then
      continue
    fi
    cp "$path" "$dest_dir/$base"
  done
}

apply_squash_database() {
  local database="$1"
  local migrations_src="$2"
  local helpers_sql="$3"
  local rest_dir="/tmp/squash-${database}-rest"

  prepare_rest_migrations "$migrations_src" "$rest_dir"

  if [[ "$database" == "app" ]]; then
    local migrator_user="$DB_APP_MIGRATOR_USER"
    local migrator_password="$DB_APP_MIGRATOR_PASSWORD"
    local db_name="$DB_APP_NAME"
  else
    local migrator_user="$DB_MANAGEMENT_MIGRATOR_USER"
    local migrator_password="$DB_MANAGEMENT_MIGRATOR_PASSWORD"
    local db_name="$DB_MANAGEMENT_NAME"
  fi

  PGPASSWORD="$migrator_password" psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U "$migrator_user" -d "$db_name" -f "$helpers_sql"

  LINEAR_MIGRATIONS_DIR="$rest_dir" \
    DB_HOST=127.0.0.1 DB_PORT=5432 \
    bash /work/scripts/database/run-linear-migrations.sh --database "$database"
}

normalize_seed_timestamps() {
  local user="$1"
  local password="$2"
  local db="$3"
  PGPASSWORD="$password" psql -v ON_ERROR_STOP=1 -h 127.0.0.1 -p 5432 -U "$user" -d "$db" <<'SQL'
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

apply_squash_database app \
  "/work/infra/k8s/base/ops/source/database/linear-migrations/app" \
  "/work/infra/k8s/base/ops/source/database/linear-migrations/app/0000_init_helpers.sql"

apply_squash_database management \
  "/work/infra/k8s/base/ops/source/database/linear-migrations/management" \
  "/work/infra/k8s/base/ops/source/database/linear-migrations/management/0000_init_helpers.sql"

normalize_seed_timestamps "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_APP_NAME"
normalize_seed_timestamps "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_MANAGEMENT_NAME"
INNER

strip_helpers_overlap_from_dump() {
  local infile="$1"
  local outfile="$2"
  python3 - "$infile" "$outfile" <<'PY'
import re
import sys

source_path, dest_path = sys.argv[1], sys.argv[2]
with open(source_path, encoding='utf-8') as handle:
    content = handle.read()

domain_names = [
    'nano_id_v2', 'varchar_short', 'varchar_normal', 'varchar_long', 'varchar_longer',
    'varchar_email', 'varchar_fcm_token', 'varchar_fqdn', 'varchar_guid', 'varchar_locale',
    'varchar_md5', 'varchar_password', 'varchar_slug', 'varchar_uri', 'varchar_url',
    'server_time', 'server_time_with_default', 'media_player_time', 'list_position', 'numeric_20_11',
]

for name in domain_names:
    content = re.sub(
        rf'CREATE DOMAIN public\.{re.escape(name)} AS[\s\S]*?;\n',
        '',
        content,
        count=1,
    )
    content = re.sub(
        rf'COMMENT ON DOMAIN public\.{re.escape(name)} IS[\s\S]*?;\n',
        '',
        content,
        count=1,
    )

content = re.sub(
    r'CREATE FUNCTION public\.set_updated_at_field\(\) RETURNS trigger[\s\S]*?\$\$;\n',
    '',
    content,
    count=1,
)
content = re.sub(
    r'--\n-- Name: linear_migration_history_id_seq; Type: SEQUENCE;[\s\S]*?CACHE 1;\n\n',
    '',
    content,
    count=1,
)
content = re.sub(
    r"SELECT pg_catalog\.set_config\('search_path', '', false\);\n",
    '',
    content,
    count=1,
)

with open(dest_path, 'w', encoding='utf-8') as handle:
    handle.write(content)
PY
}

dump_database_objects() {
  local user="$1"
  local password="$2"
  local db="$3"
  local out_host_path="$4"

  local tmp_dump
  tmp_dump="$(mktemp)"

  docker exec -e "PGPASSWORD=$password" "$CONTAINER_NAME" \
    pg_dump -h 127.0.0.1 -p 5432 -U "$user" -d "$db" \
    --no-owner \
    --exclude-table-and-children=public.linear_migration_history >"$tmp_dump"

  strip_helpers_overlap_from_dump "$tmp_dump" "$out_host_path"
  rm -f "$tmp_dump"

  if grep -qE '^\\(un)?restrict ' "$out_host_path" 2>/dev/null; then
    sed -E '/^\\(un)?restrict /d' "$out_host_path" > "${out_host_path}.sedtmp" && mv "${out_host_path}.sedtmp" "$out_host_path"
  fi
}

TMP_APP="$(mktemp)"
TMP_MGT="$(mktemp)"
trap 'rm -f "$TMP_APP" "$TMP_MGT"; cleanup' EXIT

dump_database_objects "$DB_APP_MIGRATOR_USER" "$DB_APP_MIGRATOR_PASSWORD" "$DB_APP_NAME" "$TMP_APP"
dump_database_objects "$DB_MANAGEMENT_MIGRATOR_USER" "$DB_MANAGEMENT_MIGRATOR_PASSWORD" "$DB_MANAGEMENT_NAME" "$TMP_MGT"

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/squash-linear-migrations.sh" ""
  printf '%s\n' "-- App schema + reference data (apply after 0000_init_helpers.sql)." ""
  cat "$TMP_APP"
  printf '\n'
} >"$APP_OUT"

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/squash-linear-migrations.sh" ""
  printf '%s\n' "-- Management schema + reference data (apply after 0000_init_helpers.sql)." ""
  cat "$TMP_MGT"
  printf '\n'
} >"$MGT_OUT"

echo "Wrote: $APP_OUT"
echo "Wrote: $MGT_OUT"

if [[ "$WRITE" == false ]]; then
  echo ""
  echo "Review artifacts, then re-run with --write to replace linear-migrations 0001_* files."
fi
