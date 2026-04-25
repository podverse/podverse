#!/usr/bin/env bash
# Validate forward-only migration file conventions and applied checksum integrity.
#
# Usage:
#   ./scripts/database/validate-linear-migrations.sh
#   ./scripts/database/validate-linear-migrations.sh --check-db

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

CHECK_DB=false
DB_HOST="${DB_HOST:-localhost}"
DB_PORT="${DB_PORT:-5432}"
ENV_FILE="$REPO_ROOT/infra/config/local/db.env"

while [[ $# -gt 0 ]]; do
  case "$1" in
    --check-db)
      CHECK_DB=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--check-db]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--check-db]"
      exit 1
      ;;
  esac
done

validate_directory() {
  local directory="$1"
  local label="$2"
  local previous_prefix=""
  local count=0

  mapfile -t files < <(printf '%s\n' "$directory"/*.sql | sort)
  if ((${#files[@]} == 0)); then
    echo "No migrations found in $directory"
    exit 1
  fi

  for file_path in "${files[@]}"; do
    local file_name
    file_name="$(basename "$file_path")"
    local prefix
    prefix="${file_name%%_*}"
    count=$((count + 1))

    if [[ ! "$file_name" =~ ^[0-9]{4}_[a-z0-9_]+\.sql$ ]]; then
      echo "Invalid migration filename format ($label): $file_name"
      exit 1
    fi

    if [[ -n "$previous_prefix" && "$prefix" < "$previous_prefix" ]]; then
      echo "Migration ordering regression ($label): $file_name"
      exit 1
    fi

    previous_prefix="$prefix"
  done

  echo "✓ $label migration filenames validated ($count files)"
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

validate_directory "$REPO_ROOT/infra/k8s/base/db/source/app" "app"
validate_directory "$REPO_ROOT/infra/k8s/base/db/source/management" "management"

validate_ops_bundle_sync() {
  local ops_kustomization="$REPO_ROOT/infra/k8s/base/ops/kustomization.yaml"
  local kustomization_content missing=0

  if [[ ! -f "$ops_kustomization" ]]; then
    echo "Missing ops kustomization: $ops_kustomization"
    exit 1
  fi

  kustomization_content="$(<"$ops_kustomization")"

  mapfile -t app_files < <(printf '%s\n' "$REPO_ROOT/infra/k8s/base/db/source/app"/*.sql | sort)
  for app_file_path in "${app_files[@]}"; do
    app_file_name="$(basename "$app_file_path")"
    expected_entry="- ../../../../infra/k8s/base/db/source/app/$app_file_name"
    if [[ "$kustomization_content" != *"$expected_entry"* ]]; then
      echo "Missing app migration in ops kustomization: $app_file_name"
      missing=1
    fi
  done

  mapfile -t management_files < <(printf '%s\n' "$REPO_ROOT/infra/k8s/base/db/source/management"/*.sql | sort)
  for management_file_path in "${management_files[@]}"; do
    management_file_name="$(basename "$management_file_path")"
    expected_entry="- ../../../../infra/k8s/base/db/source/management/$management_file_name"
    if [[ "$kustomization_content" != *"$expected_entry"* ]]; then
      echo "Missing management migration in ops kustomization: $management_file_name"
      missing=1
    fi
  done

  if [[ "$missing" == "1" ]]; then
    echo "Ops migration bundle is out of sync. Update infra/k8s/base/ops/kustomization.yaml."
    exit 1
  fi

  echo "✓ ops migration bundle sync validated"
}

validate_ops_bundle_sync

if [[ "$CHECK_DB" == true ]]; then
  if [[ ! -f "$ENV_FILE" ]]; then
    echo "Cannot check DB checksums: missing $ENV_FILE"
    exit 1
  fi

  # shellcheck disable=SC1090
  source "$ENV_FILE"

  validate_db_checksums() {
    local database="$1"
    local user="$2"
    local password="$3"
    local db_name="$4"
    local migrations_dir="$5"

    local table_exists
    table_exists="$(PGPASSWORD="$password" psql -h "$DB_HOST" -p "$DB_PORT" -U "$user" -d "$db_name" -t -A -c "SELECT EXISTS (SELECT 1 FROM information_schema.tables WHERE table_schema = 'public' AND table_name = 'linear_migration_history');")"
    if [[ "$table_exists" != "t" ]]; then
      echo "Missing linear_migration_history in $database DB ($db_name)"
      exit 1
    fi

    mapfile -t applied_rows < <(PGPASSWORD="$password" psql -h "$DB_HOST" -p "$DB_PORT" -U "$user" -d "$db_name" -t -A -c "SELECT migration_filename || '|' || migration_checksum FROM linear_migration_history ORDER BY migration_filename;")
    for row in "${applied_rows[@]}"; do
      migration_filename="${row%%|*}"
      stored_checksum="${row#*|}"
      migration_path="$migrations_dir/$migration_filename"

      if [[ ! -f "$migration_path" ]]; then
        echo "Applied migration missing on disk ($database): $migration_filename"
        exit 1
      fi

      current_checksum="$(compute_sha256 "$migration_path")"
      if [[ "$stored_checksum" != "$current_checksum" ]]; then
        echo "Checksum mismatch ($database): $migration_filename"
        exit 1
      fi
    done

    echo "✓ $database DB checksum validation passed"
  }

  validate_db_checksums "app" "${DB_APP_ADMIN_USER}" "${DB_APP_ADMIN_PASSWORD}" "${DB_APP_NAME:-podverse_app}" "$REPO_ROOT/infra/k8s/base/db/source/app"
  validate_db_checksums "management" "${DB_MANAGEMENT_ADMIN_USER}" "${DB_MANAGEMENT_ADMIN_PASSWORD}" "${DB_MANAGEMENT_NAME:-podverse_management}" "$REPO_ROOT/infra/k8s/base/db/source/management"
fi

echo "Linear migration validation passed."
