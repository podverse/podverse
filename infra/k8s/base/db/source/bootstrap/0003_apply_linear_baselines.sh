#!/bin/sh
# Loads generated schema snapshots as dedicated migrator-owner roles.
# Archives live under /linear-baseline/ only — not in docker-entrypoint-initdb.d — so Postgres
# does not auto-run them as a single superuser .sql.gz.
set -eu

: "${DB_APP_OWNER_USER:?}"
: "${DB_APP_OWNER_PASSWORD:?}"
: "${DB_APP_NAME:?}"
: "${DB_MANAGEMENT_OWNER_USER:?}"
: "${DB_MANAGEMENT_OWNER_PASSWORD:?}"
: "${DB_APP_MIGRATOR_USER:?}"
: "${DB_APP_MIGRATOR_PASSWORD:?}"
: "${DB_MANAGEMENT_MIGRATOR_USER:?}"
: "${DB_MANAGEMENT_MIGRATOR_PASSWORD:?}"
: "${DB_MANAGEMENT_NAME:?}"

# Initdb scripts run in-process with Postgres entrypoint. Default to local Unix socket
# for deterministic startup; callers can still override PGHOST explicitly.
export PGHOST="${PGHOST:-/var/run/postgresql}"
export PGPORT="${PGPORT:-5432}"

wait_for_psql() {
  user="$1"
  password="$2"
  db="$3"
  attempts="${4:-30}"
  i=1
  while [ "$i" -le "$attempts" ]; do
    if PGPASSWORD="$password" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -tAc 'SELECT 1' >/dev/null 2>&1; then
      return 0
    fi
    sleep 1
    i=$((i + 1))
  done

  echo "ERROR: Postgres is not ready for user=$user db=$db host=$PGHOST port=$PGPORT after ${attempts}s." >&2
  return 1
}

assert_extension_exists() {
  user="$1"
  password="$2"
  db="$3"
  extension="$4"
  exists="$(
    PGPASSWORD="$password" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -tAc \
      "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = '${extension}');"
  )"
  if [ "$exists" != "t" ]; then
    echo "ERROR: Expected extension '${extension}' in database '${db}' but it is missing." >&2
    return 1
  fi
}

assert_baseline_loaded() {
  user="$1"
  password="$2"
  db="$3"

  has_history="$(
    PGPASSWORD="$password" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -tAc \
      "SELECT to_regclass('public.linear_migration_history') IS NOT NULL;"
  )"
  table_count="$(
    PGPASSWORD="$password" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -tAc \
      "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';"
  )"

  if [ "$has_history" != "t" ]; then
    echo "ERROR: Baseline validation failed for '${db}': linear_migration_history is missing." >&2
    return 1
  fi
  if [ "${table_count:-0}" -eq 0 ]; then
    echo "ERROR: Baseline validation failed for '${db}': public schema is empty." >&2
    return 1
  fi
}

wait_for_psql "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_APP_NAME"
wait_for_psql "$DB_MANAGEMENT_OWNER_USER" "$DB_MANAGEMENT_OWNER_PASSWORD" "$DB_MANAGEMENT_NAME"

PGPASSWORD="$DB_APP_OWNER_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$DB_APP_OWNER_USER" -d "$DB_APP_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
PGPASSWORD="$DB_MANAGEMENT_OWNER_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$DB_MANAGEMENT_OWNER_USER" -d "$DB_MANAGEMENT_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
assert_extension_exists "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_APP_NAME" "uuid-ossp"
assert_extension_exists "$DB_MANAGEMENT_OWNER_USER" "$DB_MANAGEMENT_OWNER_PASSWORD" "$DB_MANAGEMENT_NAME" "uuid-ossp"

export PGPASSWORD="$DB_APP_MIGRATOR_PASSWORD"
gunzip -c /linear-baseline/app.sql.gz | psql -v ON_ERROR_STOP=1 -U "$DB_APP_MIGRATOR_USER" -d "$DB_APP_NAME"
assert_baseline_loaded "$DB_APP_MIGRATOR_USER" "$DB_APP_MIGRATOR_PASSWORD" "$DB_APP_NAME"

export PGPASSWORD="$DB_MANAGEMENT_MIGRATOR_PASSWORD"
gunzip -c /linear-baseline/management.sql.gz | psql -v ON_ERROR_STOP=1 -U "$DB_MANAGEMENT_MIGRATOR_USER" -d "$DB_MANAGEMENT_NAME"
assert_baseline_loaded "$DB_MANAGEMENT_MIGRATOR_USER" "$DB_MANAGEMENT_MIGRATOR_PASSWORD" "$DB_MANAGEMENT_NAME"
