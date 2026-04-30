#!/usr/bin/env bash
# Verifies DB bootstrap contract for app and management databases.
# Checks:
# - uuid-ossp extension exists
# - linear_migration_history table exists
# - public schema has tables
# - read_write/read roles have expected table privileges

set -euo pipefail

DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-localhost}}"
DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"

: "${DB_APP_OWNER_USER:?Missing DB_APP_OWNER_USER}"
: "${DB_APP_OWNER_PASSWORD:?Missing DB_APP_OWNER_PASSWORD}"
: "${DB_APP_NAME:?Missing DB_APP_NAME}"
: "${DB_APP_READ_WRITE_USER:?Missing DB_APP_READ_WRITE_USER}"
: "${DB_APP_READ_USER:?Missing DB_APP_READ_USER}"

: "${DB_MANAGEMENT_OWNER_USER:?Missing DB_MANAGEMENT_OWNER_USER}"
: "${DB_MANAGEMENT_OWNER_PASSWORD:?Missing DB_MANAGEMENT_OWNER_PASSWORD}"
: "${DB_MANAGEMENT_NAME:?Missing DB_MANAGEMENT_NAME}"
: "${DB_MANAGEMENT_READ_WRITE_USER:?Missing DB_MANAGEMENT_READ_WRITE_USER}"
: "${DB_MANAGEMENT_READ_USER:?Missing DB_MANAGEMENT_READ_USER}"

run_query() {
  local password="$1"
  local user="$2"
  local db="$3"
  local query="$4"
  PGPASSWORD="$password" psql \
    -v ON_ERROR_STOP=1 \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$user" \
    -d "$db" \
    -tAc "$query"
}

assert_equals() {
  local label="$1"
  local actual="$2"
  local expected="$3"
  if [[ "$actual" != "$expected" ]]; then
    echo "ERROR: ${label} expected '${expected}' but got '${actual}'." >&2
    exit 1
  fi
}

assert_positive_int() {
  local label="$1"
  local value="$2"
  if ! [[ "$value" =~ ^[0-9]+$ ]] || [[ "$value" -eq 0 ]]; then
    echo "ERROR: ${label} expected a positive integer but got '${value}'." >&2
    exit 1
  fi
}

check_database_contract() {
  local role_password="$1"
  local role_user="$2"
  local db_name="$3"
  local read_write_role="$4"
  local read_role="$5"
  local label="$6"

  echo "Verifying ${label} database bootstrap contract (${db_name})..."

  local has_extension
  has_extension="$(run_query "$role_password" "$role_user" "$db_name" "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');")"
  assert_equals "${label}: uuid-ossp extension" "$has_extension" "t"

  local has_history
  has_history="$(run_query "$role_password" "$role_user" "$db_name" "SELECT to_regclass('public.linear_migration_history') IS NOT NULL;")"
  assert_equals "${label}: linear_migration_history exists" "$has_history" "t"

  local table_count
  table_count="$(run_query "$role_password" "$role_user" "$db_name" "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';")"
  assert_positive_int "${label}: public schema table count" "$table_count"

  local rw_select rw_insert rw_update rw_delete ro_select
  rw_select="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_table_privilege('${read_write_role}', 'public.linear_migration_history', 'SELECT');")"
  rw_insert="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_table_privilege('${read_write_role}', 'public.linear_migration_history', 'INSERT');")"
  rw_update="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_table_privilege('${read_write_role}', 'public.linear_migration_history', 'UPDATE');")"
  rw_delete="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_table_privilege('${read_write_role}', 'public.linear_migration_history', 'DELETE');")"
  ro_select="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_table_privilege('${read_role}', 'public.linear_migration_history', 'SELECT');")"

  assert_equals "${label}: read_write SELECT" "$rw_select" "t"
  assert_equals "${label}: read_write INSERT" "$rw_insert" "t"
  assert_equals "${label}: read_write UPDATE" "$rw_update" "t"
  assert_equals "${label}: read_write DELETE" "$rw_delete" "t"
  assert_equals "${label}: read SELECT" "$ro_select" "t"
}

check_database_contract \
  "$DB_APP_OWNER_PASSWORD" \
  "$DB_APP_OWNER_USER" \
  "$DB_APP_NAME" \
  "$DB_APP_READ_WRITE_USER" \
  "$DB_APP_READ_USER" \
  "app"

check_database_contract \
  "$DB_MANAGEMENT_OWNER_PASSWORD" \
  "$DB_MANAGEMENT_OWNER_USER" \
  "$DB_MANAGEMENT_NAME" \
  "$DB_MANAGEMENT_READ_WRITE_USER" \
  "$DB_MANAGEMENT_READ_USER" \
  "management"

echo "Bootstrap contract verification passed for app and management databases."
