#!/usr/bin/env bash
# After local_env_setup: persist resolved secrets to home local-secrets.env (empty keys only).

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
fi

persist_if_home_empty() {
	local var="$1"
	local value="$2"

	local_secrets_upsert_var_if_empty "$HOME_SECRETS" "$var" "$value"
}

if [ -f "$DB_ENV" ]; then
	while IFS= read -r var; do
		[ -n "$var" ] || continue
		persist_if_home_empty "$var" "$(local_secrets_get_var "$DB_ENV" "$var")"
	done < <(local_secrets_var_names | grep '^DB_')
fi

if [ -f "$MQ_ENV" ]; then
	persist_if_home_empty "ARTEMIS_PASSWORD" "$(local_secrets_get_var "$MQ_ENV" "ARTEMIS_PASSWORD")"
fi

if [ -f "$KEYVALDB_ENV" ]; then
	persist_if_home_empty "KEYVALDB_PASSWORD" "$(local_secrets_get_var "$KEYVALDB_ENV" "KEYVALDB_PASSWORD")"
fi

if [ -f "$API_APP_ENV" ]; then
	persist_if_home_empty "AUTH_JWT_SECRET_API" "$(local_secrets_get_var "$API_APP_ENV" "AUTH_JWT_SECRET")"
fi

if [ -f "$MANAGEMENT_API_APP_ENV" ]; then
	persist_if_home_empty "AUTH_JWT_SECRET_MANAGEMENT" "$(local_secrets_get_var "$MANAGEMENT_API_APP_ENV" "AUTH_JWT_SECRET")"
fi
