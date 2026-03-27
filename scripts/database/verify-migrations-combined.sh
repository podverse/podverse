#!/usr/bin/env bash
# Version: 2
# Verify that combined database files match the migration files
#
# This script is used by CI to ensure developers haven't forgotten to run
# the combine script after adding migrations.
#
# Usage: ./scripts/database/verify-migrations-combined.sh
# Exit code: 0 if files match, 1 if mismatch

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

# Create temp directory
TEMP_DIR=$(mktemp -d)
trap "rm -rf $TEMP_DIR" EXIT

echo "Verifying database migration files are combined..."
echo ""

# Function to combine migrations to a temp file (without timestamp)
combine_to_temp() {
  local migrations_dir="$1"
  local output_file="$2"

  echo "-- Combined migrations (verification)" >"$output_file"
  echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >>"$output_file"
  echo "" >>"$output_file"

  for migration in $(ls "$migrations_dir"/*.sql | sort); do
    echo "-- Including: $(basename $migration)" >>"$output_file"
    cat "$migration" >>"$output_file"
    echo "" >>"$output_file"
    echo "" >>"$output_file"
  done
}

# Function to compare files (skip line 1 which has timestamp)
compare_files() {
  local expected="$1"
  local actual="$2"
  local name="$3"

  # Compare from line 2 onwards (skip timestamp line)
  if diff -q <(tail -n +2 "$expected") <(tail -n +2 "$actual") >/dev/null 2>&1; then
    echo -e "${GREEN}✓ $name is up to date${NC}"
    return 0
  else
    echo -e "${RED}✗ $name is out of sync!${NC}"
    echo ""
    echo "Differences found:"
    diff <(tail -n +2 "$expected") <(tail -n +2 "$actual") || true
    return 1
  fi
}

ERRORS=0

SOURCE_DIR="$REPO_ROOT/infra/k8s/base/db/source"

# Check main database
MAIN_MIGRATIONS="$REPO_ROOT/infra/database/migrations"
MAIN_COMBINED="$SOURCE_DIR/00_init_database.sql"
MAIN_TEMP="$TEMP_DIR/00_init_database.sql"

combine_to_temp "$MAIN_MIGRATIONS" "$MAIN_TEMP"
if ! compare_files "$MAIN_TEMP" "$MAIN_COMBINED" "Main database (00_init_database.sql)"; then
  ERRORS=$((ERRORS + 1))
fi

echo ""

# Check management database
MGMT_MIGRATIONS="$REPO_ROOT/infra/database/management/migrations"
MGMT_COMBINED="$SOURCE_DIR/00_init_management_database.sql"
MGMT_TEMP="$TEMP_DIR/00_init_management_database.sql"

combine_to_temp "$MGMT_MIGRATIONS" "$MGMT_TEMP"
if ! compare_files "$MGMT_TEMP" "$MGMT_COMBINED" "Management database (00_init_management_database.sql)"; then
  ERRORS=$((ERRORS + 1))
fi

echo ""

if [ $ERRORS -gt 0 ]; then
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo -e "${RED}  Database migration files are out of sync!${NC}"
  echo -e "${RED}════════════════════════════════════════════════════════════${NC}"
  echo ""
  echo -e "${YELLOW}To fix, run:${NC}"
  echo "  npm run db:combine"
  echo ""
  echo "Then commit the updated combined files."
  exit 1
fi

echo -e "${GREEN}All database migration files are properly combined.${NC}"
exit 0
