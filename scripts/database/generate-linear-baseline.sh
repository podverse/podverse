#!/usr/bin/env bash
# Rebuild a single initdb SQL file from: bootstrap 0001 + 0002, then the full
# linear app + management migration chains, then pg_dump of each database.
# Output: infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql
# Do not edit 0003 manually; re-run this script or `make db_regen_linear_baseline` after migration changes.
# `make db_regen_linear_baseline` also runs generate-linear-migration-history-seed.sh to refresh 0004_seed_linear_migration_history.sql.
#
# Requires: docker, a POSIX shell
#
# Usage: ./scripts/database/generate-linear-baseline.sh [output.sql]
#        BASELINE_IN_DOCKER=0 ...    # not supported — Docker is required

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

OUT_REL_DEFAULT="infra/k8s/base/db/source/bootstrap/0003_linear_baseline.sql"
OUT="${1:-$REPO_ROOT/$OUT_REL_DEFAULT}"
if [[ "$OUT" != /* ]]; then
  OUT="$REPO_ROOT/$OUT"
fi

if ! command -v docker >/dev/null 2>&1; then
  echo "docker is required to generate the linear baseline." >&2
  exit 1
fi

CONTAINER_NAME="podverse-linear-baseline-$$"
APP_DUMP="$(mktemp)"
MGT_DUMP="$(mktemp)"
cleanup() {
  rm -f "$APP_DUMP" "$MGT_DUMP" 2>/dev/null || true
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true

# shellcheck disable=SC2016
docker run -d --name "$CONTAINER_NAME" \
  -v "$REPO_ROOT:/work" \
  -e "POSTGRES_USER=$DB_APP_ADMIN_USER" \
  -e "POSTGRES_PASSWORD=$DB_APP_ADMIN_PASSWORD" \
  -e "POSTGRES_DB=$DB_APP_NAME" \
  postgres:18.3

for _ in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_APP_ADMIN_USER" -d "$DB_APP_NAME" -h 127.0.0.1 -p 5432 >/dev/null 2>&1; then
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
docker exec -e "PGPASSWORD=$DB_APP_ADMIN_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -h 127.0.0.1 -p 5432 -U "$DB_APP_ADMIN_USER" -d "$DB_APP_NAME" --schema-only --no-owner > "$APP_DUMP"

# shellcheck disable=SC2016,SC2029
docker exec -e "PGPASSWORD=$DB_MANAGEMENT_ADMIN_PASSWORD" "$CONTAINER_NAME" \
  pg_dump -h 127.0.0.1 -p 5432 -U "$DB_MANAGEMENT_ADMIN_USER" -d "$DB_MANAGEMENT_NAME" --schema-only --no-owner > "$MGT_DUMP"

# pg_dump 18+ may emit psql \restrict / \unrestrict with random tokens; strip for stable output.
for f in "$APP_DUMP" "$MGT_DUMP"; do
  if grep -qE '^\\(un)?restrict ' "$f" 2>/dev/null; then
    sed -E '/^\\(un)?restrict /d' "$f" > "${f}.sedtmp" && mv "${f}.sedtmp" "$f"
  fi
done

{
  printf '%s\n' "-- GENERATED FILE (do not edit) — see scripts/database/generate-linear-baseline.sh and docs/operations/LINEAR-MIGRATIONS.md" ""
  printf "%s\n" "\connect $DB_APP_NAME" ""
  cat "$APP_DUMP"
  printf '\n'
  printf "%s\n" "\connect $DB_MANAGEMENT_NAME" ""
  cat "$MGT_DUMP"
  printf '\n'
} > "$OUT"

echo "Wrote: $OUT"
