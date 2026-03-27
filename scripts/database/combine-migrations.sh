#!/usr/bin/env bash
# Version: 2
# Combine all migrations into init_database.sql files
#
# Usage: ./scripts/database/combine-migrations.sh
# Requires Bash 4+ (use from repo dev shell or: ./scripts/nix/with-env ./scripts/database/combine-migrations.sh)
#
# This script combines migration files for both main and management databases
# into infra/k8s/base/db/source/

set -e
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

ensure_parent_dir() {
  local target_path="$1"
  local target_dir

  target_dir="$(dirname "$target_path")"
  mkdir -p "$target_dir"
}

SOURCE_DIR="$REPO_ROOT/infra/k8s/base/db/source"
mkdir -p "$SOURCE_DIR"

# Main database
MAIN_MIGRATIONS="$REPO_ROOT/infra/database/migrations"
MAIN_COMBINED="$SOURCE_DIR/00_init_database.sql"
MAIN_INIT_SCRIPTS="$REPO_ROOT/infra/database/init-scripts/01-create-users.sh"

echo "Combining main database migrations..."
ensure_parent_dir "$MAIN_COMBINED"
echo "-- Combined migrations generated $(date)" >"$MAIN_COMBINED"
echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >>"$MAIN_COMBINED"
echo "" >>"$MAIN_COMBINED"

main_migrations=("$MAIN_MIGRATIONS"/*.sql)
if ((${#main_migrations[@]} > 0)); then
  mapfile -t main_migrations_sorted < <(printf '%s\n' "${main_migrations[@]}" | sort)
  for migration in "${main_migrations_sorted[@]}"; do
    {
      echo "-- Including: $(basename "$migration")"
      cat "$migration"
      echo ""
      echo ""
    } >>"$MAIN_COMBINED"
  done
fi

echo "Copying main init script..."
cp "$MAIN_INIT_SCRIPTS" "$SOURCE_DIR/01_create_app_users.sh"

echo "✓ Main database combined: $MAIN_COMBINED"

# Management database
MGMT_MIGRATIONS="$REPO_ROOT/infra/database/management/migrations"
MGMT_COMBINED="$SOURCE_DIR/00_init_management_database.sql"
MGMT_INIT_SCRIPTS="$REPO_ROOT/infra/database/management/init-scripts/01-create-users.sh"

echo "Combining management database migrations..."
ensure_parent_dir "$MGMT_COMBINED"
echo "-- Combined migrations generated $(date)" >"$MGMT_COMBINED"
echo "-- DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh" >>"$MGMT_COMBINED"
echo "" >>"$MGMT_COMBINED"

mgmt_migrations=("$MGMT_MIGRATIONS"/*.sql)
if ((${#mgmt_migrations[@]} > 0)); then
  mapfile -t mgmt_migrations_sorted < <(printf '%s\n' "${mgmt_migrations[@]}" | sort)
  for migration in "${mgmt_migrations_sorted[@]}"; do
    {
      echo "-- Including: $(basename "$migration")"
      cat "$migration"
      echo ""
      echo ""
    } >>"$MGMT_COMBINED"
  done
fi

echo "Copying management init script..."
cp "$MGMT_INIT_SCRIPTS" "$SOURCE_DIR/01_create_management_users.sh"

echo "✓ Management database combined: $MGMT_COMBINED"
echo ""
echo "Done! Both databases combined successfully into $SOURCE_DIR."
