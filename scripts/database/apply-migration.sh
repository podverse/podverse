#!/bin/bash
# Apply a single migration file to a local database
#
# Usage: ./scripts/database/apply-migration.sh [OPTIONS] <migration_file>
#
# Options:
#   -d, --database    Database to migrate: main (default) or management
#   -n, --dry-run     Show SQL without executing
#   -h, --help        Show this help message
#
# Examples:
#   ./scripts/database/apply-migration.sh 0013_add_podcast_chapters.sql
#   ./scripts/database/apply-migration.sh -d management 0002_new_admin_feature.sql
#   ./scripts/database/apply-migration.sh --dry-run 0013_add_podcast_chapters.sql

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Defaults
DATABASE="main"
DRY_RUN=false
MIGRATION_FILE=""

# Parse arguments
while [[ $# -gt 0 ]]; do
  case $1 in
    -d|--database)
      DATABASE="$2"
      shift 2
      ;;
    -n|--dry-run)
      DRY_RUN=true
      shift
      ;;
    -h|--help)
      head -20 "$0" | tail -18
      exit 0
      ;;
    *)
      MIGRATION_FILE="$1"
      shift
      ;;
  esac
done

# Validate arguments
if [ -z "$MIGRATION_FILE" ]; then
  echo "Error: Migration file is required"
  echo "Usage: $0 [OPTIONS] <migration_file>"
  exit 1
fi

if [ "$DATABASE" != "main" ] && [ "$DATABASE" != "management" ]; then
  echo "Error: Database must be 'main' or 'management'"
  exit 1
fi

# Set paths based on database
if [ "$DATABASE" = "main" ]; then
  MIGRATIONS_DIR="$REPO_ROOT/infra/database/migrations"
  ENV_FILE="$REPO_ROOT/infra/config/local/db.env"
  DB_NAME="podverse_db"
else
  MIGRATIONS_DIR="$REPO_ROOT/infra/database/management/migrations"
  ENV_FILE="$REPO_ROOT/infra/config/local/management-db.env"
  DB_NAME="podverse_management_db"
fi

MIGRATION_PATH="$MIGRATIONS_DIR/$MIGRATION_FILE"

# Validate migration file exists
if [ ! -f "$MIGRATION_PATH" ]; then
  echo "Error: Migration file not found: $MIGRATION_PATH"
  echo ""
  echo "Available migrations:"
  ls -1 "$MIGRATIONS_DIR"/*.sql 2>/dev/null | xargs -n1 basename
  exit 1
fi

echo "Database: $DATABASE"
echo "Migration: $MIGRATION_FILE"
echo ""

if [ "$DRY_RUN" = true ]; then
  echo "=== DRY RUN - SQL Preview ==="
  echo ""
  cat "$MIGRATION_PATH"
  echo ""
  echo "=== End of SQL Preview ==="
  echo ""
  echo "To apply this migration, run without --dry-run"
  exit 0
fi

# Load environment variables
if [ ! -f "$ENV_FILE" ]; then
  echo "Error: Environment file not found: $ENV_FILE"
  echo "Run 'make local_db_up' first to create local environment files"
  exit 1
fi

# shellcheck disable=SC1090
source "$ENV_FILE"

# Apply migration
echo "Applying migration..."
PGPASSWORD="${POSTGRES_PASSWORD}" psql \
  -h localhost \
  -p 5432 \
  -U "${POSTGRES_USER}" \
  -d "${DB_NAME}" \
  -f "$MIGRATION_PATH"

echo ""
echo "✓ Migration applied successfully: $MIGRATION_FILE"
