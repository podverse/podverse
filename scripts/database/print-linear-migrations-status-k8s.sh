#!/usr/bin/env bash
# Print applied/pending linear migration status for K8s jobs.
#
# Usage:
#   MIGRATION_DATABASE=app ./scripts/database/print-linear-migrations-status-k8s.sh
#   MIGRATION_DATABASE=management ./scripts/database/print-linear-migrations-status-k8s.sh

set -euo pipefail
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

MIGRATION_DATABASE="${MIGRATION_DATABASE:-}"

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--database)
      MIGRATION_DATABASE="$2"
      shift 2
      ;;
    -h|--help)
      echo "Usage: $0 --database <app|management>"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 --database <app|management>"
      exit 1
      ;;
  esac
done

if [[ -z "$MIGRATION_DATABASE" ]]; then
  echo "Missing required --database <app|management> argument (or MIGRATION_DATABASE env)."
  echo "Usage: $0 --database <app|management>"
  exit 1
fi

if [[ "$MIGRATION_DATABASE" != "app" && "$MIGRATION_DATABASE" != "management" ]]; then
  echo "Database must be one of: app, management"
  echo "Usage: $0 --database <app|management>"
  exit 1
fi

if [[ "$MIGRATION_DATABASE" == "app" ]]; then
  MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/app"
  DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-}}"
  DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"
  DB_USER="${DB_USER:-${DB_APP_MIGRATOR_USER:-}}"
  DB_PASSWORD="${DB_PASSWORD:-${DB_APP_MIGRATOR_PASSWORD:-}}"
  DB_NAME="${DB_NAME:-${DB_APP_NAME:-}}"
else
  MIGRATIONS_DIR="$REPO_ROOT/infra/k8s/base/ops/source/database/linear-migrations/management"
  DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-}}"
  DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"
  DB_USER="${DB_USER:-${DB_MANAGEMENT_MIGRATOR_USER:-}}"
  DB_PASSWORD="${DB_PASSWORD:-${DB_MANAGEMENT_MIGRATOR_PASSWORD:-}}"
  DB_NAME="${DB_NAME:-${DB_MANAGEMENT_NAME:-}}"
fi

if [[ -z "${DB_HOST:-}" || -z "${DB_USER:-}" || -z "${DB_PASSWORD:-}" || -z "${DB_NAME:-}" ]]; then
  echo "Missing required DB connection environment values."
  exit 1
fi

mapfile -t migration_files < <(printf '%s\n' "$MIGRATIONS_DIR"/*.sql | sort)

echo "Database: $MIGRATION_DATABASE"
echo "Connection: $DB_HOST:$DB_PORT / $DB_NAME"
echo ""

for migration_path in "${migration_files[@]}"; do
  migration_filename="$(basename "$migration_path")"
  applied="$(PGPASSWORD="$DB_PASSWORD" psql -h "$DB_HOST" -p "$DB_PORT" -U "$DB_USER" -d "$DB_NAME" -t -A -c "SELECT EXISTS (SELECT 1 FROM linear_migration_history WHERE migration_filename = '$migration_filename');")"
  if [[ "$applied" == "t" ]]; then
    echo "APPLIED $migration_filename"
  else
    echo "PENDING $migration_filename"
  fi
done
