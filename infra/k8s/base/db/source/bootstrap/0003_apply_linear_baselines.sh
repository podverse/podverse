#!/bin/sh
# Loads generated schema snapshots as dedicated migrator-owner roles.
# Archives live under /linear-baseline/ only — not in docker-entrypoint-initdb.d — so Postgres
# does not auto-run them as a single superuser .sql.gz.
set -eu

: "${DB_APP_OWNER_USER:?}"
: "${DB_APP_OWNER_PASSWORD:?}"
: "${DB_APP_NAME:?}"
: "${DB_MANAGEMENT_OWNER_USER:?}"
: "${DB_MANAGEMENT_OWNER_PASSWORD:?}"
: "${DB_APP_MIGRATOR_USER:?}"
: "${DB_APP_MIGRATOR_PASSWORD:?}"
: "${DB_MANAGEMENT_MIGRATOR_USER:?}"
: "${DB_MANAGEMENT_MIGRATOR_PASSWORD:?}"
: "${DB_MANAGEMENT_NAME:?}"

export PGHOST="${PGHOST:-127.0.0.1}"
export PGPORT="${PGPORT:-5432}"

PGPASSWORD="$DB_APP_OWNER_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$DB_APP_OWNER_USER" -d "$DB_APP_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'
PGPASSWORD="$DB_MANAGEMENT_OWNER_PASSWORD" psql -v ON_ERROR_STOP=1 -U "$DB_MANAGEMENT_OWNER_USER" -d "$DB_MANAGEMENT_NAME" -c 'CREATE EXTENSION IF NOT EXISTS "uuid-ossp";'

export PGPASSWORD="$DB_APP_MIGRATOR_PASSWORD"
gunzip -c /linear-baseline/app.sql.gz | psql -v ON_ERROR_STOP=1 -U "$DB_APP_MIGRATOR_USER" -d "$DB_APP_NAME"

export PGPASSWORD="$DB_MANAGEMENT_MIGRATOR_PASSWORD"
gunzip -c /linear-baseline/management.sql.gz | psql -v ON_ERROR_STOP=1 -U "$DB_MANAGEMENT_MIGRATOR_USER" -d "$DB_MANAGEMENT_NAME"
