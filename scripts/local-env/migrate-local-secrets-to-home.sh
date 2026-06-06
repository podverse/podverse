#!/usr/bin/env bash
# One-time / idempotent: copy existing repo infra secrets into home local-secrets.env
# when home keys are missing or still placeholders. Does not overwrite real home values.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

# shellcheck source=scripts/local-env/local-secrets-lib.sh
. "$SCRIPT_DIR/local-secrets-lib.sh"

HOME_SECRETS="$(local_secrets_home_file)"
DB_ENV="infra/config/local/db.env"
MQ_ENV="infra/config/local/mq.env"
KEYVALDB_ENV="infra/config/local/keyvaldb.env"
API_APP_ENV="apps/api/.env"
MANAGEMENT_API_APP_ENV="apps/management-api/.env"

mkdir -p "$(dirname "$HOME_SECRETS")"
if [ ! -f "$HOME_SECRETS" ]; then
	cp dev/env-overrides/local/local-secrets.env.example "$HOME_SECRETS"
	echo "Created $HOME_SECRETS from example"
fi

copy_if_home_empty() {
	local var="$1"
	local value="$2"

	local_secrets_upsert_var_if_empty "$HOME_SECRETS" "$var" "$value"
}

# DB passwords from infra db.env
if [ -f "$DB_ENV" ]; then
	while IFS= read -r var; do
		[ -n "$var" ] || continue
		value="$(local_secrets_get_var "$DB_ENV" "$var")"
		copy_if_home_empty "$var" "$value"
	done < <(local_secrets_var_names | grep '^DB_')
fi

if [ -f "$MQ_ENV" ]; then
	copy_if_home_empty "ARTEMIS_PASSWORD" "$(local_secrets_get_var "$MQ_ENV" "ARTEMIS_PASSWORD")"
fi

if [ -f "$KEYVALDB_ENV" ]; then
	copy_if_home_empty "KEYVALDB_PASSWORD" "$(local_secrets_get_var "$KEYVALDB_ENV" "KEYVALDB_PASSWORD")"
fi

if [ -f "$API_APP_ENV" ]; then
	copy_if_home_empty "AUTH_JWT_SECRET_API" "$(local_secrets_get_var "$API_APP_ENV" "AUTH_JWT_SECRET")"
fi

if [ -f "$MANAGEMENT_API_APP_ENV" ]; then
	copy_if_home_empty "AUTH_JWT_SECRET_MANAGEMENT" "$(local_secrets_get_var "$MANAGEMENT_API_APP_ENV" "AUTH_JWT_SECRET")"
fi
