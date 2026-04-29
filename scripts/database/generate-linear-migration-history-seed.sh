#!/usr/bin/env bash
# Generate infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql
#
# After 0003a/0003b linear baselines materialize schema (including empty linear_migration_history),
# this script inserts one row per forward-only migration file with SHA-256 checksums matching
# infra/k8s/base/ops/source/database/runner/run-linear-migrations.sh — so ops migration jobs skip
# already-materialized DDL on fresh clusters.
#
# Usage:
#   bash scripts/database/generate-linear-migration-history-seed.sh [output.sql]
#
# Default output: infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

OUT_REL_DEFAULT="infra/k8s/base/db/source/bootstrap/0004_seed_linear_migration_history.sql"
OUT="${1:-$REPO_ROOT/$OUT_REL_DEFAULT}"
if [[ "$OUT" != /* ]]; then
  OUT="$REPO_ROOT/$OUT"
fi

# Database names must match scripts/database/db.generate-baseline.env and cluster secrets.
DB_APP_NAME="${DB_APP_NAME:-podverse_app}"
DB_MANAGEMENT_NAME="${DB_MANAGEMENT_NAME:-podverse_management}"

APP_MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/app"
MGMT_MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/management"

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

emit_insert_block() {
  local db_label="$1"
  shift
  local -a files=("$@")
  local first=true
  local path filename checksum esc_fn esc_sum

  echo "-- ${db_label} database"
  echo "INSERT INTO linear_migration_history (migration_filename, migration_checksum) VALUES"

  for path in "${files[@]}"; do
    filename="$(basename "$path")"
    checksum="$(compute_sha256 "$path")"
    esc_fn="$(sql_escape_literal "$filename")"
    esc_sum="$(sql_escape_literal "$checksum")"
    if [[ "$first" == true ]]; then
      first=false
    else
      echo ","
    fi
    printf "  ('%s', '%s')" "$esc_fn" "$esc_sum"
  done
  echo ""
  echo "ON CONFLICT (migration_filename) DO NOTHING;"
  echo ""
}

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-migration-history-seed.sh"
  printf '%s\n' "-- Seeds linear_migration_history so forward-only ops jobs match baseline-materialized schema."
  printf '%s\n' ""
  printf '%s\n' "\\connect $DB_APP_NAME"
  printf '%s\n' ""

  mapfile -t app_files < <(printf '%s\n' "$APP_MIGRATIONS_DIR"/*.sql | sort)
  if ((${#app_files[@]} == 0)); then
    echo "No app migrations in $APP_MIGRATIONS_DIR" >&2
    exit 1
  fi
  emit_insert_block "App" "${app_files[@]}"

  printf '%s\n' "\\connect $DB_MANAGEMENT_NAME"
  printf '%s\n' ""

  mapfile -t mgmt_files < <(printf '%s\n' "$MGMT_MIGRATIONS_DIR"/*.sql | sort)
  if ((${#mgmt_files[@]} == 0)); then
    echo "No management migrations in $MGMT_MIGRATIONS_DIR" >&2
    exit 1
  fi
  emit_insert_block "Management" "${mgmt_files[@]}"
} >"$OUT"

echo "Wrote: $OUT"
