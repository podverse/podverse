#!/bin/bash
# Combine all migrations into init_database.sql files
#
# Usage: ./scripts/database/combine-migrations.sh
#
# This script combines migration files for both main and management databases
# into their respective combined/init_*.sql files.

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

# Main database
MAIN_MIGRATIONS="$REPO_ROOT/infra/database/migrations"
MAIN_COMBINED="$REPO_ROOT/infra/database/combined/init_database.sql"

echo "Combining main database migrations..."
echo "-- Combined migrations generated $(date)" > "$MAIN_COMBINED"
echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >> "$MAIN_COMBINED"
echo "" >> "$MAIN_COMBINED"

for migration in $(ls "$MAIN_MIGRATIONS"/*.sql | sort); do
  echo "-- Including: $(basename $migration)" >> "$MAIN_COMBINED"
  cat "$migration" >> "$MAIN_COMBINED"
  echo "" >> "$MAIN_COMBINED"
  echo "" >> "$MAIN_COMBINED"
done

echo "✓ Main database combined: $MAIN_COMBINED"

# Management database
MGMT_MIGRATIONS="$REPO_ROOT/infra/database/management/migrations"
MGMT_COMBINED="$REPO_ROOT/infra/database/management/combined/init_management_database.sql"

echo "Combining management database migrations..."
echo "-- Combined migrations generated $(date)" > "$MGMT_COMBINED"
echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >> "$MGMT_COMBINED"
echo "" >> "$MGMT_COMBINED"

for migration in $(ls "$MGMT_MIGRATIONS"/*.sql | sort); do
  echo "-- Including: $(basename $migration)" >> "$MGMT_COMBINED"
  cat "$migration" >> "$MGMT_COMBINED"
  echo "" >> "$MGMT_COMBINED"
  echo "" >> "$MGMT_COMBINED"
done

echo "✓ Management database combined: $MGMT_COMBINED"
echo ""
echo "Done! Both databases combined successfully."
