#!/usr/bin/env bash
# K8s-oriented wrapper for linear migration runner.
#
# Required:
#   MIGRATION_DATABASE=app|management
#   App: DB_HOST, DB_PORT, DB_APP_MIGRATOR_USER, DB_APP_MIGRATOR_PASSWORD, DB_APP_NAME
#   Management: DB_HOST, DB_PORT, DB_MANAGEMENT_MIGRATOR_USER, DB_MANAGEMENT_MIGRATOR_PASSWORD, DB_MANAGEMENT_NAME
#   LINEAR_MIGRATIONS_BASE_DIR (optional; defaults to /opt/infra/k8s/base/ops/source/database/linear-migrations)

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

MIGRATION_DATABASE="${MIGRATION_DATABASE:-}"
DRY_RUN=false

while [[ $# -gt 0 ]]; do
  case "$1" in
    -d|--database)
      MIGRATION_DATABASE="$2"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      echo "Usage: $0 [--database <app|management>] [--dry-run]"
      exit 0
      ;;
    *)
      echo "Unknown option: $1"
      echo "Usage: $0 [--database <app|management>] [--dry-run]"
      exit 1
      ;;
  esac
done

if [[ -z "$MIGRATION_DATABASE" ]]; then
  echo "Missing required --database <app|management> argument (or MIGRATION_DATABASE env)."
  echo "Usage: $0 [--database <app|management>] [--dry-run]"
  exit 1
fi

if [[ "$MIGRATION_DATABASE" != "app" && "$MIGRATION_DATABASE" != "management" ]]; then
  echo "Database must be one of: app, management"
  echo "Usage: $0 [--database <app|management>] [--dry-run]"
  exit 1
fi

if [[ "$MIGRATION_DATABASE" == "app" ]]; then
  export DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-}}"
  export DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"
else
  export DB_HOST="${DB_HOST:-${PODVERSE_DB_SERVICE_HOST:-}}"
  export DB_PORT="${DB_PORT:-${PODVERSE_DB_SERVICE_PORT:-5432}}"
fi

export LINEAR_MIGRATIONS_BASE_DIR="${LINEAR_MIGRATIONS_BASE_DIR:-/opt/infra/k8s/base/ops/source/database/linear-migrations}"
export LINEAR_MIGRATIONS_DIR="${LINEAR_MIGRATIONS_DIR:-$LINEAR_MIGRATIONS_BASE_DIR/$MIGRATION_DATABASE}"

if [[ "$MIGRATION_DATABASE" == "app" ]]; then
  if [[ -z "${DB_HOST:-}" || -z "${DB_PORT:-}" || -z "${DB_APP_MIGRATOR_USER:-}" || -z "${DB_APP_MIGRATOR_PASSWORD:-}" || -z "${DB_APP_NAME:-}" ]]; then
    echo "Missing required env for K8s app migration: DB_HOST, DB_PORT, DB_APP_MIGRATOR_USER, DB_APP_MIGRATOR_PASSWORD, DB_APP_NAME."
    exit 1
  fi
else
  if [[ -z "${DB_HOST:-}" || -z "${DB_PORT:-}" || -z "${DB_MANAGEMENT_MIGRATOR_USER:-}" || -z "${DB_MANAGEMENT_MIGRATOR_PASSWORD:-}" || -z "${DB_MANAGEMENT_NAME:-}" ]]; then
    echo "Missing required env for K8s management migration: DB_HOST, DB_PORT, DB_MANAGEMENT_MIGRATOR_USER, DB_MANAGEMENT_MIGRATOR_PASSWORD, DB_MANAGEMENT_NAME."
    exit 1
  fi
fi

args=(--database "$MIGRATION_DATABASE")
if [[ "$DRY_RUN" == true ]]; then
  args+=(--dry-run)
fi

bash "$SCRIPT_DIR/run-linear-migrations.sh" "${args[@]}"
