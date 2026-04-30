#!/usr/bin/env bash
# Rebuild generated linear baseline archives from bootstrap 0001 + 0002, then the full
# linear app + management migration chains, then pg_dump of each database (separate files).
# Default outputs:
#   infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz
#   infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz
# Pass a directory as the first argument to write both files there (for verify-linear-baseline.sh).
# Pass a path ending in .sql for uncompressed combined debug output (legacy).
# Do not edit 0003a/0003b manually; re-run this script or `make db_regen_linear_baseline` after migration changes.
# `make db_regen_linear_baseline` also runs generate-linear-migration-history-seed.sh to refresh 0004_seed_linear_migration_history.sql.
#
# Requires: docker, gzip (when writing .gz), a POSIX shell
#
# Usage: ./scripts/database/generate-linear-baseline.sh [output_dir | combined.sql]

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck disable=SC1091
set -a
# shellcheck source=scripts/database/db.generate-baseline.env
source "$SCRIPT_DIR/db.generate-baseline.env"
set +a

export REPO_ROOT
export DB_HOST="${DB_HOST:-127.0.0.1}"
export DB_PORT="${DB_PORT:-5432}"

DEFAULT_OUT_DIR="$REPO_ROOT/infra/k8s/base/db/source/bootstrap"
OUT_APP_REL="0003a_app_linear_baseline.sql.gz"
OUT_MGT_REL="0003b_management_linear_baseline.sql.gz"

FIRST_ARG="${1:-}"
OUT_DIR="$DEFAULT_OUT_DIR"
COMBINED_SQL_DEBUG=""
if [[ -n "$FIRST_ARG" ]]; then
  if [[ -d "$FIRST_ARG" ]]; then
    OUT_DIR="$(cd "$FIRST_ARG" && pwd)"
  elif [[ "$FIRST_ARG" == *.sql ]]; then
    COMBINED_SQL_DEBUG="$FIRST_ARG"
    if [[ "$COMBINED_SQL_DEBUG" != /* ]]; then
      COMBINED_SQL_DEBUG="$REPO_ROOT/$COMBINED_SQL_DEBUG"
    fi
  else
    echo "Usage: $0 [output_directory | path/to/debug.sql]" >&2
    exit 1
  fi
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to generate the linear baseline." >&2
  exit 1
fi

CONTAINER_NAME="podverse-linear-baseline-$$"
APP_DUMP="$(mktemp)"
MGT_DUMP="$(mktemp)"
TMP_APP_SQL="$(mktemp)"
TMP_MGT_SQL="$(mktemp)"
cleanup() {
  rm -f "$APP_DUMP" "$MGT_DUMP" "$TMP_APP_SQL" "$TMP_MGT_SQL" 2>/dev/null || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

# shellcheck disable=SC2016
docker run -d --name "$CONTAINER_NAME" \
  -v "$REPO_ROOT:/work" \
  -e "POSTGRES_USER=$DB_APP_OWNER_USER" \
  -e "POSTGRES_PASSWORD=$DB_APP_OWNER_PASSWORD" \
  -e "POSTGRES_DB=$DB_APP_NAME" \
  postgres:18.3

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_APP_OWNER_USER" -d "$DB_APP_NAME" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
    break
  fi
  sleep 0.5
done

# shellcheck disable=SC2016,SC1091,SC2029
docker exec -i "$CONTAINER_NAME" bash -s <<INNER
set -euo pipefail
set -a
# shellcheck disable=SC1090
source /work/scripts/database/db.generate-baseline.env
set +a
export REPO_ROOT=/work
export DB_HOST=127.0.0.1
export DB_PORT=5432
cd /work
bash /work/infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh
bash /work/infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh
bash /work/scripts/database/run-linear-migrations.sh --database app
bash /work/scripts/database/run-linear-migrations.sh --database management
INNER

# shellcheck disable=SC2016,SC2029
docker exec -e "PGPASSWORD=$DB_APP_MIGRATOR_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -h 127.0.0.1 -p 5432 -U "$DB_APP_MIGRATOR_USER" -d "$DB_APP_NAME" --schema-only --no-owner > "$APP_DUMP"

# shellcheck disable=SC2016,SC2029
docker exec -e "PGPASSWORD=$DB_MANAGEMENT_MIGRATOR_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -h 127.0.0.1 -p 5432 -U "$DB_MANAGEMENT_MIGRATOR_USER" -d "$DB_MANAGEMENT_NAME" --schema-only --no-owner > "$MGT_DUMP"

for f in "$APP_DUMP" "$MGT_DUMP"; do
  if grep -qE '^\\(un)?restrict ' "$f" 2>/dev/null; then
    sed -E '/^\\(un)?restrict /d' "$f" > "${f}.sedtmp" && mv "${f}.sedtmp" "$f"
  fi
done

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-baseline.sh and docs/operations/LINEAR-MIGRATIONS.md" ""
  printf '%s\n' "-- App database schema only (applied as DB_APP_MIGRATOR_USER via 0003_apply_linear_baselines.sh)." ""
  cat "$APP_DUMP"
  printf '\n'
} >"$TMP_APP_SQL"

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-baseline.sh and docs/operations/LINEAR-MIGRATIONS.md" ""
  printf '%s\n' "-- Management database schema only (applied as DB_MANAGEMENT_MIGRATOR_USER via 0003_apply_linear_baselines.sh)." ""
  cat "$MGT_DUMP"
  printf '\n'
} >"$TMP_MGT_SQL"

if [[ -n "$COMBINED_SQL_DEBUG" ]]; then
  {
    printf '%s\n' "-- GENERATED DEBUG (combined)" ""
    printf "%s\n" "\\connect $DB_APP_NAME" ""
    cat "$APP_DUMP"
    printf '\n'
    printf "%s\n" "\\connect $DB_MANAGEMENT_NAME" ""
    cat "$MGT_DUMP"
    printf '\n'
  } >"$COMBINED_SQL_DEBUG"
  echo "Wrote debug SQL: $COMBINED_SQL_DEBUG"
fi

mkdir -p "$OUT_DIR"
if ! command -v gzip >/dev/null 2>&1; then
  echo "gzip is required to write compressed baseline (.sql.gz)." >&2
  exit 1
fi
gzip -nc <"$TMP_APP_SQL" >"$OUT_DIR/$OUT_APP_REL"
gzip -nc <"$TMP_MGT_SQL" >"$OUT_DIR/$OUT_MGT_REL"

echo "Wrote: $OUT_DIR/$OUT_APP_REL"
echo "Wrote: $OUT_DIR/$OUT_MGT_REL"
