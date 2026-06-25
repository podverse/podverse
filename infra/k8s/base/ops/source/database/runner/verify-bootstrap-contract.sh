#!/usr/bin/env bash
# Verifies DB bootstrap contract for app and management databases.
# Checks:
# - uuid-ossp extension exists
# - linear_migration_history table exists
# - public schema has tables
# - critical reference rows exist (management admin_account_role)
# - read_write/read roles have schema USAGE and expected table privileges
# - read_write/read can query linear_migration_history (runtime access, not catalog-only)

set -euo pipefail

DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-localhost}}"
DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"

: "${DB_APP_OWNER_USER:?Missing DB_APP_OWNER_USER}"
: "${DB_APP_OWNER_PASSWORD:?Missing DB_APP_OWNER_PASSWORD}"
: "${DB_APP_NAME:?Missing DB_APP_NAME}"
: "${DB_APP_READ_WRITE_USER:?Missing DB_APP_READ_WRITE_USER}"
: "${DB_APP_READ_WRITE_PASSWORD:?Missing DB_APP_READ_WRITE_PASSWORD}"
: "${DB_APP_READ_USER:?Missing DB_APP_READ_USER}"
: "${DB_APP_READ_PASSWORD:?Missing DB_APP_READ_PASSWORD}"

: "${DB_MANAGEMENT_OWNER_USER:?Missing DB_MANAGEMENT_OWNER_USER}"
: "${DB_MANAGEMENT_OWNER_PASSWORD:?Missing DB_MANAGEMENT_OWNER_PASSWORD}"
: "${DB_MANAGEMENT_NAME:?Missing DB_MANAGEMENT_NAME}"
: "${DB_MANAGEMENT_READ_WRITE_USER:?Missing DB_MANAGEMENT_READ_WRITE_USER}"
: "${DB_MANAGEMENT_READ_WRITE_PASSWORD:?Missing DB_MANAGEMENT_READ_WRITE_PASSWORD}"
: "${DB_MANAGEMENT_READ_USER:?Missing DB_MANAGEMENT_READ_USER}"
: "${DB_MANAGEMENT_READ_PASSWORD:?Missing DB_MANAGEMENT_READ_PASSWORD}"

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
  local read_write_password="$5"
  local read_role="$6"
  local read_password="$7"
  local label="$8"

  echo "Verifying ${label} database bootstrap contract (${db_name})..."

  local has_extension
  has_extension="$(run_query "$role_password" "$role_user" "$db_name" "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname = 'uuid-ossp');")"
  assert_equals "${label}: uuid-ossp extension" "$has_extension" "t"

  local has_history
  has_history="$(run_query "$role_password" "$role_user" "$db_name" "SELECT to_regclass('public.linear_migration_history') IS NOT NULL;")"
  assert_equals "${label}: linear_migration_history exists" "$has_history" "t"

  local table_count
  table_count="$(run_query "$role_password" "$role_user" "$db_name" "SELECT count(*) FROM pg_catalog.pg_tables WHERE schemaname = 'public';")"
  assert_positive_int "${label}: public schema table count" "$table_count"

  local rw_schema_usage ro_schema_usage
  rw_schema_usage="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_schema_privilege('${read_write_role}', 'public', 'USAGE');")"
  ro_schema_usage="$(run_query "$role_password" "$role_user" "$db_name" "SELECT has_schema_privilege('${read_role}', 'public', 'USAGE');")"
  assert_equals "${label}: read_write schema USAGE" "$rw_schema_usage" "t"
  assert_equals "${label}: read schema USAGE" "$ro_schema_usage" "t"

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

  local rw_history_count ro_history_count
  rw_history_count="$(run_query "$read_write_password" "$read_write_role" "$db_name" "SELECT count(*) FROM linear_migration_history;")"
  ro_history_count="$(run_query "$read_password" "$read_role" "$db_name" "SELECT count(*) FROM linear_migration_history;")"
  assert_positive_int "${label}: read_write linear_migration_history row count" "$rw_history_count"
  assert_positive_int "${label}: read linear_migration_history row count" "$ro_history_count"

  if [[ "$label" == "management" ]]; then
    local has_superuser_role has_admin_role
    has_superuser_role="$(run_query "$read_write_password" "$read_write_role" "$db_name" "SELECT EXISTS (SELECT 1 FROM admin_account_role WHERE id = 1 AND role = 'superuser');")"
    has_admin_role="$(run_query "$read_write_password" "$read_write_role" "$db_name" "SELECT EXISTS (SELECT 1 FROM admin_account_role WHERE id = 2 AND role = 'admin');")"
    assert_equals "${label}: admin_account_role superuser row" "$has_superuser_role" "t"
    assert_equals "${label}: admin_account_role admin row" "$has_admin_role" "t"
  fi
}

check_database_contract \
  "$DB_APP_OWNER_PASSWORD" \
  "$DB_APP_OWNER_USER" \
  "$DB_APP_NAME" \
  "$DB_APP_READ_WRITE_USER" \
  "$DB_APP_READ_WRITE_PASSWORD" \
  "$DB_APP_READ_USER" \
  "$DB_APP_READ_PASSWORD" \
  "app"

check_database_contract \
  "$DB_MANAGEMENT_OWNER_PASSWORD" \
  "$DB_MANAGEMENT_OWNER_USER" \
  "$DB_MANAGEMENT_NAME" \
  "$DB_MANAGEMENT_READ_WRITE_USER" \
  "$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
  "$DB_MANAGEMENT_READ_USER" \
  "$DB_MANAGEMENT_READ_PASSWORD" \
  "management"

echo "Bootstrap contract verification passed for app and management databases."
