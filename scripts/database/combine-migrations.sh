#!/bin/bash
# Combine all migrations into init_database.sql files
#
# Usage: ./scripts/database/combine-migrations.sh
#
# This script combines migration files for both main and management databases
# into their respective combined/init_*.sql files.

set -e
shopt -s nullglob

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

append_indented_file() {
	local source_file="$1"
	local indent="$2"
	local target_file="$3"

	while IFS= read -r line || [[ -n "$line" ]]; do
		if [[ -z "${line//[[:space:]]/}" ]]; then
			printf '\n' >>"$target_file"
			continue
		fi
		printf '%s%s\n' "$indent" "$line" >>"$target_file"
	done <"$source_file"
}

ensure_parent_dir() {
	local target_path="$1"
	local target_dir

	target_dir="$(dirname "$target_path")"
	mkdir -p "$target_dir"
}

# Main database
MAIN_MIGRATIONS="$REPO_ROOT/infra/database/migrations"
MAIN_COMBINED="$REPO_ROOT/infra/database/combined/init_database.sql"
MAIN_INIT_SCRIPTS="$REPO_ROOT/infra/database/init-scripts/01-create-users.sh"
MAIN_CONFIGMAP="$REPO_ROOT/infra/k8s/base/db/init-scripts.configmap.yaml"

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

echo "✓ Main database combined: $MAIN_COMBINED"

echo "Generating K8s init scripts ConfigMap..."
ensure_parent_dir "$MAIN_CONFIGMAP"
cat <<EOF >"$MAIN_CONFIGMAP"
apiVersion: v1
kind: ConfigMap
# DO NOT EDIT - regenerate with scripts/database/combine-migrations.sh
metadata:
  name: podverse-db-init-scripts
data:
  00_init_database.sql: |
EOF
append_indented_file "$MAIN_COMBINED" "    " "$MAIN_CONFIGMAP"
cat <<EOF >>"$MAIN_CONFIGMAP"
  01-create-users.sh: |
EOF
append_indented_file "$MAIN_INIT_SCRIPTS" "    " "$MAIN_CONFIGMAP"

echo "✓ K8s ConfigMap written: $MAIN_CONFIGMAP"

# Management database
MGMT_MIGRATIONS="$REPO_ROOT/infra/database/management/migrations"
MGMT_COMBINED="$REPO_ROOT/infra/database/management/combined/init_management_database.sql"

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

echo "✓ Management database combined: $MGMT_COMBINED"
echo ""
echo "Done! Both databases combined successfully."
