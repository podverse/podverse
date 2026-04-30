#!/usr/bin/env bash
# CI bootstrap contract check:
# - Starts ephemeral Postgres with initdb scripts 0001/0002/0003 and baseline archives
# - Verifies uuid-ossp, linear history presence, and critical reference rows
set -euo pipefail

REPO_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")/../.." && pwd)"

required_files=(
  "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh"
  "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh"
  "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003_apply_linear_baselines.sh"
  "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz"
  "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz"
)
for file in "${required_files[@]}"; do
  if [[ ! -f "$file" ]]; then
    echo "ERROR: Missing required bootstrap file: $file" >&2
    exit 1
  fi
done

generate_password() {
  openssl rand -hex 16
}

DB_APP_NAME="podverse_app"
DB_MANAGEMENT_NAME="podverse_management"
DB_APP_OWNER_USER="podverse_app_owner"
DB_APP_OWNER_PASSWORD="$(generate_password)"
DB_APP_MIGRATOR_USER="podverse_app_migrator"
DB_APP_MIGRATOR_PASSWORD="$(generate_password)"
DB_APP_READ_WRITE_USER="podverse_app_read_write"
DB_APP_READ_WRITE_PASSWORD="$(generate_password)"
DB_APP_READ_USER="podverse_app_read"
DB_APP_READ_PASSWORD="$(generate_password)"
DB_MANAGEMENT_OWNER_USER="podverse_management_owner"
DB_MANAGEMENT_OWNER_PASSWORD="$(generate_password)"
DB_MANAGEMENT_MIGRATOR_USER="podverse_management_migrator"
DB_MANAGEMENT_MIGRATOR_PASSWORD="$(generate_password)"
DB_MANAGEMENT_READ_WRITE_USER="podverse_management_read_write"
DB_MANAGEMENT_READ_WRITE_PASSWORD="$(generate_password)"
DB_MANAGEMENT_READ_USER="podverse_management_read"
DB_MANAGEMENT_READ_PASSWORD="$(generate_password)"

CONTAINER_NAME="podverse-bootstrap-contract-$$"
cleanup() {
  docker rm -f "$CONTAINER_NAME" >/dev/null 2>&1 || true
}
trap cleanup EXIT

docker run -d --name "$CONTAINER_NAME" \
  -e POSTGRES_DB="$DB_APP_NAME" \
  -e POSTGRES_USER="$DB_APP_OWNER_USER" \
  -e POSTGRES_PASSWORD="$DB_APP_OWNER_PASSWORD" \
  -e DB_APP_NAME="$DB_APP_NAME" \
  -e DB_APP_OWNER_USER="$DB_APP_OWNER_USER" \
  -e DB_APP_OWNER_PASSWORD="$DB_APP_OWNER_PASSWORD" \
  -e DB_APP_MIGRATOR_USER="$DB_APP_MIGRATOR_USER" \
  -e DB_APP_MIGRATOR_PASSWORD="$DB_APP_MIGRATOR_PASSWORD" \
  -e DB_APP_READ_WRITE_USER="$DB_APP_READ_WRITE_USER" \
  -e DB_APP_READ_WRITE_PASSWORD="$DB_APP_READ_WRITE_PASSWORD" \
  -e DB_APP_READ_USER="$DB_APP_READ_USER" \
  -e DB_APP_READ_PASSWORD="$DB_APP_READ_PASSWORD" \
  -e DB_MANAGEMENT_NAME="$DB_MANAGEMENT_NAME" \
  -e DB_MANAGEMENT_OWNER_USER="$DB_MANAGEMENT_OWNER_USER" \
  -e DB_MANAGEMENT_OWNER_PASSWORD="$DB_MANAGEMENT_OWNER_PASSWORD" \
  -e DB_MANAGEMENT_MIGRATOR_USER="$DB_MANAGEMENT_MIGRATOR_USER" \
  -e DB_MANAGEMENT_MIGRATOR_PASSWORD="$DB_MANAGEMENT_MIGRATOR_PASSWORD" \
  -e DB_MANAGEMENT_READ_WRITE_USER="$DB_MANAGEMENT_READ_WRITE_USER" \
  -e DB_MANAGEMENT_READ_WRITE_PASSWORD="$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
  -e DB_MANAGEMENT_READ_USER="$DB_MANAGEMENT_READ_USER" \
  -e DB_MANAGEMENT_READ_PASSWORD="$DB_MANAGEMENT_READ_PASSWORD" \
  -v "$REPO_ROOT:/work:ro" \
  -v "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0001_create_app_db_users.sh:/docker-entrypoint-initdb.d/0001_create_app_db_users.sh:ro" \
  -v "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0002_create_management_db_users.sh:/docker-entrypoint-initdb.d/0002_create_management_db_users.sh:ro" \
  -v "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003_apply_linear_baselines.sh:/docker-entrypoint-initdb.d/0003_apply_linear_baselines.sh:ro" \
  -v "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003a_app_linear_baseline.sql.gz:/linear-baseline/app.sql.gz:ro" \
  -v "$REPO_ROOT/infra/k8s/base/db/source/bootstrap/0003b_management_linear_baseline.sql.gz:/linear-baseline/management.sql.gz:ro" \
  postgres:18.3 >/dev/null

for attempt in $(seq 1 60); do
  if docker exec "$CONTAINER_NAME" pg_isready -U "$DB_APP_OWNER_USER" -d "$DB_APP_NAME" >/dev/null 2>&1; then
    break
  fi
  sleep 1
  if [[ "$attempt" -eq 60 ]]; then
    echo "ERROR: Postgres did not become ready in time." >&2
    docker logs "$CONTAINER_NAME" >&2 || true
    exit 1
  fi
done

check_query() {
  local user="$1"
  local pass="$2"
  local db="$3"
  local sql="$4"
  docker exec "$CONTAINER_NAME" env PGPASSWORD="$pass" psql -v ON_ERROR_STOP=1 -U "$user" -d "$db" -tAc "$sql"
}

check_query_or_false() {
  local user="$1"
  local pass="$2"
  local db="$3"
  local sql="$4"
  local value

  if value="$(check_query "$user" "$pass" "$db" "$sql" 2>/dev/null)"; then
    echo "$value"
    return 0
  fi

  echo "f"
}

app_ext="f"
mgmt_ext="f"
app_history="f"
mgmt_history="f"
mgmt_roles="f"

# pg_isready only means the server accepts connections. The init scripts may still
# be running, so wait for the actual bootstrap contract state before asserting.
for attempt in $(seq 1 120); do
  app_ext="$(check_query_or_false "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_APP_NAME" "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='uuid-ossp');")"
  mgmt_ext="$(check_query_or_false "$DB_MANAGEMENT_OWNER_USER" "$DB_MANAGEMENT_OWNER_PASSWORD" "$DB_MANAGEMENT_NAME" "SELECT EXISTS (SELECT 1 FROM pg_extension WHERE extname='uuid-ossp');")"
  app_history="$(check_query_or_false "$DB_APP_OWNER_USER" "$DB_APP_OWNER_PASSWORD" "$DB_APP_NAME" "SELECT to_regclass('public.linear_migration_history') IS NOT NULL;")"
  mgmt_history="$(check_query_or_false "$DB_MANAGEMENT_OWNER_USER" "$DB_MANAGEMENT_OWNER_PASSWORD" "$DB_MANAGEMENT_NAME" "SELECT to_regclass('public.linear_migration_history') IS NOT NULL;")"
  mgmt_roles="$(check_query_or_false "$DB_MANAGEMENT_READ_WRITE_USER" "$DB_MANAGEMENT_READ_WRITE_PASSWORD" "$DB_MANAGEMENT_NAME" "SELECT EXISTS (SELECT 1 FROM admin_account_role WHERE id = 1 AND role = 'superuser') AND EXISTS (SELECT 1 FROM admin_account_role WHERE id = 2 AND role = 'admin');")"

  if [[ "$app_ext" == "t" && "$mgmt_ext" == "t" && "$app_history" == "t" && "$mgmt_history" == "t" && "$mgmt_roles" == "t" ]]; then
    break
  fi

  if [[ "$attempt" -eq 120 ]]; then
    echo "ERROR: Bootstrap contract failed." >&2
    echo "app_ext=$app_ext mgmt_ext=$mgmt_ext app_history=$app_history mgmt_history=$mgmt_history mgmt_roles=$mgmt_roles" >&2
    docker logs "$CONTAINER_NAME" >&2 || true
    exit 1
  fi

  sleep 1
done

if [[ "$app_ext" != "t" || "$mgmt_ext" != "t" || "$app_history" != "t" || "$mgmt_history" != "t" || "$mgmt_roles" != "t" ]]; then
  echo "ERROR: Bootstrap contract failed." >&2
  echo "app_ext=$app_ext mgmt_ext=$mgmt_ext app_history=$app_history mgmt_history=$mgmt_history mgmt_roles=$mgmt_roles" >&2
  docker logs "$CONTAINER_NAME" >&2 || true
  exit 1
fi

echo "Bootstrap contract checks passed. Replaying migration runner for app and management..."
docker exec "$CONTAINER_NAME" env \
  DB_HOST="127.0.0.1" \
  DB_PORT="5432" \
  DB_APP_NAME="$DB_APP_NAME" \
  DB_APP_MIGRATOR_USER="$DB_APP_MIGRATOR_USER" \
  DB_APP_MIGRATOR_PASSWORD="$DB_APP_MIGRATOR_PASSWORD" \
  DB_MANAGEMENT_NAME="$DB_MANAGEMENT_NAME" \
  DB_MANAGEMENT_MIGRATOR_USER="$DB_MANAGEMENT_MIGRATOR_USER" \
  DB_MANAGEMENT_MIGRATOR_PASSWORD="$DB_MANAGEMENT_MIGRATOR_PASSWORD" \
  LINEAR_MIGRATIONS_BASE_DIR="/work/infra/k8s/base/ops/source/database/linear-migrations" \
  bash /work/scripts/database/run-linear-migrations.sh --database app
docker exec "$CONTAINER_NAME" env \
  DB_HOST="127.0.0.1" \
  DB_PORT="5432" \
  DB_APP_NAME="$DB_APP_NAME" \
  DB_APP_MIGRATOR_USER="$DB_APP_MIGRATOR_USER" \
  DB_APP_MIGRATOR_PASSWORD="$DB_APP_MIGRATOR_PASSWORD" \
  DB_MANAGEMENT_NAME="$DB_MANAGEMENT_NAME" \
  DB_MANAGEMENT_MIGRATOR_USER="$DB_MANAGEMENT_MIGRATOR_USER" \
  DB_MANAGEMENT_MIGRATOR_PASSWORD="$DB_MANAGEMENT_MIGRATOR_PASSWORD" \
  LINEAR_MIGRATIONS_BASE_DIR="/work/infra/k8s/base/ops/source/database/linear-migrations" \
  bash /work/scripts/database/run-linear-migrations.sh --database management

echo "Migration replay checks passed. Running management superuser-create smoke test..."
docker run --rm --network "container:$CONTAINER_NAME" \
  -e DB_HOST="127.0.0.1" \
  -e DB_PORT="5432" \
  -e DB_MANAGEMENT_NAME="$DB_MANAGEMENT_NAME" \
  -e DB_MANAGEMENT_READ_WRITE_USER="$DB_MANAGEMENT_READ_WRITE_USER" \
  -e DB_MANAGEMENT_READ_WRITE_PASSWORD="$DB_MANAGEMENT_READ_WRITE_PASSWORD" \
  -v "$REPO_ROOT/infra/k8s/base/ops/source/database/management-superuser:/opt/scripts/management:ro" \
  node:24-slim \
  /bin/sh -ceu \
  'cp -R /opt/scripts/management /tmp/management; cd /tmp/management; npm install --silent; node create-superuser.mjs --random-password'

superuser_count="$(check_query "$DB_MANAGEMENT_READ_WRITE_USER" "$DB_MANAGEMENT_READ_WRITE_PASSWORD" "$DB_MANAGEMENT_NAME" "SELECT count(*) FROM admin_account WHERE admin_account_role_id = 1;")"
if [[ "$superuser_count" != "1" ]]; then
  echo "ERROR: Expected exactly one superuser after smoke test, got $superuser_count." >&2
  docker logs "$CONTAINER_NAME" >&2 || true
  exit 1
fi

echo "CI bootstrap contract verification passed."
