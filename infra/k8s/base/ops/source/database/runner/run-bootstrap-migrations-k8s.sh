#!/usr/bin/env bash
# One-time K8s bootstrap: run app + management linear migrations once per fresh cluster/DB,
# gated by podverse_k8s_bootstrap_state in the management database.
#
# Required env (from Secrets + ops ConfigMap):
#   DB_HOST, DB_PORT
#   DB_APP_MIGRATOR_USER, DB_APP_MIGRATOR_PASSWORD, DB_APP_NAME
#   DB_MANAGEMENT_MIGRATOR_USER, DB_MANAGEMENT_MIGRATOR_PASSWORD, DB_MANAGEMENT_NAME
#   API_EXPECTED_MIGRATION_FILENAME, MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME
#   LINEAR_MIGRATIONS_BASE_DIR (optional)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

BOOTSTRAP_MARKER_KEY="${BOOTSTRAP_MARKER_KEY:-migrations_completed}"
WAIT_INTERVAL_SECONDS="${WAIT_INTERVAL_SECONDS:-2}"
INIT_WAIT_MAX_SECONDS="${INIT_WAIT_MAX_SECONDS:-900}"

DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-podverse-db}}"
DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"

: "${DB_APP_MIGRATOR_USER:?Missing DB_APP_MIGRATOR_USER}"
: "${DB_APP_MIGRATOR_PASSWORD:?Missing DB_APP_MIGRATOR_PASSWORD}"
: "${DB_APP_NAME:?Missing DB_APP_NAME}"
: "${DB_APP_OWNER_USER:?Missing DB_APP_OWNER_USER}"
: "${DB_MANAGEMENT_MIGRATOR_USER:?Missing DB_MANAGEMENT_MIGRATOR_USER}"
: "${DB_MANAGEMENT_MIGRATOR_PASSWORD:?Missing DB_MANAGEMENT_MIGRATOR_PASSWORD}"
: "${DB_MANAGEMENT_NAME:?Missing DB_MANAGEMENT_NAME}"
: "${API_EXPECTED_MIGRATION_FILENAME:?Missing API_EXPECTED_MIGRATION_FILENAME}"
: "${MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME:?Missing MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME}"

export LINEAR_MIGRATIONS_BASE_DIR="${LINEAR_MIGRATIONS_BASE_DIR:-/opt/infra/k8s/base/ops/source/database/linear-migrations}"

run_app_query() {
  local query="$1"
  PGPASSWORD="$DB_APP_MIGRATOR_PASSWORD" psql \
    -v ON_ERROR_STOP=1 \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_APP_MIGRATOR_USER" \
    -d "$DB_APP_NAME" \
    -tAc "$query"
}

run_management_query() {
  local query="$1"
  PGPASSWORD="$DB_MANAGEMENT_MIGRATOR_PASSWORD" psql \
    -v ON_ERROR_STOP=1 \
    -h "$DB_HOST" \
    -p "$DB_PORT" \
    -U "$DB_MANAGEMENT_MIGRATOR_USER" \
    -d "$DB_MANAGEMENT_NAME" \
    -tAc "$query"
}

wait_for_postgres_tcp() {
  local elapsed=0
  while true; do
    if pg_isready -h "$DB_HOST" -p "$DB_PORT" -U "$DB_APP_OWNER_USER" -d "$DB_APP_NAME" >/dev/null 2>&1; then
      echo "Postgres ready at $DB_HOST:$DB_PORT"
      return 0
    fi
    if (( elapsed >= INIT_WAIT_MAX_SECONDS )); then
      echo "ERROR: Timed out waiting for Postgres at $DB_HOST:$DB_PORT after ${INIT_WAIT_MAX_SECONDS}s." >&2
      return 1
    fi
    echo "waiting for Postgres at $DB_HOST:$DB_PORT"
    sleep "$WAIT_INTERVAL_SECONDS"
    elapsed=$((elapsed + WAIT_INTERVAL_SECONDS))
  done
}

app_migration_history_ready() {
  local ready
  ready="$(
    run_app_query "SELECT to_regclass('public.linear_migration_history') IS NOT NULL;" 2>/dev/null || true
  )"
  [[ "$(echo "$ready" | tr -d '[:space:]')" == "t" ]]
}

fail_post_init_recovery() {
  local app_table_count="${1:-0}"
  echo "ERROR: linear_migration_history is missing in the app database after ${INIT_WAIT_MAX_SECONDS}s." >&2
  if [[ "${app_table_count:-0}" -eq 0 ]]; then
    echo "The public schema appears empty (logical wipe or failed init)." >&2
    echo "After ops-db-drop-everything, run ops-db-rebootstrap-roles, then manual migrate jobs." >&2
    echo "For a full reset, delete the DB StatefulSet pod + PVC so docker-entrypoint-initdb runs again." >&2
  else
    echo "Postgres init may still be running, or baseline load failed. Check podverse-db logs." >&2
  fi
  exit 1
}

wait_for_init_baselines() {
  local elapsed=0
  while (( elapsed < INIT_WAIT_MAX_SECONDS )); do
    if app_migration_history_ready; then
      echo "linear_migration_history present in app database"
      return 0
    fi
    echo "waiting for Postgres init baselines (linear_migration_history)"
    sleep "$WAIT_INTERVAL_SECONDS"
    elapsed=$((elapsed + WAIT_INTERVAL_SECONDS))
  done

  local app_table_count="0"
  app_table_count="$(
    run_app_query "SELECT count(*) FROM information_schema.tables WHERE table_schema = 'public';" 2>/dev/null || echo "0"
  )"
  app_table_count="$(echo "$app_table_count" | tr -d '[:space:]')"
  fail_post_init_recovery "$app_table_count"
}

bootstrap_marker_exists() {
  local marker_table_exists marker_row_exists
  marker_table_exists="$(
    run_management_query "SELECT to_regclass('public.podverse_k8s_bootstrap_state') IS NOT NULL;" 2>/dev/null || true
  )"
  if [[ "$(echo "$marker_table_exists" | tr -d '[:space:]')" != "t" ]]; then
    return 1
  fi
  marker_row_exists="$(
    run_management_query "SELECT EXISTS (SELECT 1 FROM podverse_k8s_bootstrap_state WHERE state_key = '$BOOTSTRAP_MARKER_KEY');" 2>/dev/null || true
  )"
  [[ "$(echo "$marker_row_exists" | tr -d '[:space:]')" == "t" ]]
}

assert_migration_applied() {
  local database_label="$1"
  local expected_filename="$2"
  local query_runner="$3"
  local applied

  applied="$($query_runner "SELECT EXISTS (SELECT 1 FROM linear_migration_history WHERE migration_filename = '$expected_filename');")"
  if [[ "$(echo "$applied" | tr -d '[:space:]')" != "t" ]]; then
    echo "ERROR: Expected migration '$expected_filename' not recorded in $database_label linear_migration_history." >&2
    exit 1
  fi
  echo "verified $database_label migration $expected_filename"
}

insert_bootstrap_marker() {
  run_management_query "
    CREATE TABLE IF NOT EXISTS podverse_k8s_bootstrap_state (
      state_key VARCHAR(128) PRIMARY KEY,
      completed_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
    );
  "
  run_management_query "
    INSERT INTO podverse_k8s_bootstrap_state (state_key)
    VALUES ('$BOOTSTRAP_MARKER_KEY')
    ON CONFLICT (state_key) DO NOTHING;
  "
  echo "bootstrap marker recorded: $BOOTSTRAP_MARKER_KEY"
}

if bootstrap_marker_exists; then
  echo "Bootstrap migrations already completed; skipping."
  exit 0
fi

wait_for_postgres_tcp
wait_for_init_baselines

bash "$SCRIPT_DIR/run-linear-migrations-k8s.sh" --database app
bash "$SCRIPT_DIR/run-linear-migrations-k8s.sh" --database management

assert_migration_applied "app" "$API_EXPECTED_MIGRATION_FILENAME" run_app_query
assert_migration_applied "management" "$MANAGEMENT_API_EXPECTED_MIGRATION_FILENAME" run_management_query

insert_bootstrap_marker
echo "Bootstrap migrations completed successfully."
