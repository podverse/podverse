#!/usr/bin/env bash
# Copy current repo infra/app secrets into home local-secrets.env (overwrite).
# Run once from the primary checkout whose Postgres/MQ/Valkey you use.

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

upsert_always() {
	local file="$1"
	local var="$2"
	local value="$3"
	local escaped replacement

	[ -n "$value" ] || return 0
	escaped="$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')"
	replacement="${var}=\"${escaped}\""
	if grep -q -E "^${var}=" "$file" 2>/dev/null; then
		sed -i.bak "s|^${var}=.*|${replacement}|" "$file"
		rm -f "${file}.bak"
	else
		printf '%s\n' "$replacement" >>"$file"
	fi
}

if [ -f "$DB_ENV" ]; then
	while IFS= read -r var; do
		[ -n "$var" ] || continue
		value="$(local_secrets_get_var "$DB_ENV" "$var")"
		upsert_always "$HOME_SECRETS" "$var" "$value"
	done < <(local_secrets_var_names | grep '^DB_')
fi

if [ -f "$MQ_ENV" ]; then
	upsert_always "$HOME_SECRETS" "ARTEMIS_PASSWORD" "$(local_secrets_get_var "$MQ_ENV" "ARTEMIS_PASSWORD")"
fi

if [ -f "$KEYVALDB_ENV" ]; then
	upsert_always "$HOME_SECRETS" "KEYVALDB_PASSWORD" "$(local_secrets_get_var "$KEYVALDB_ENV" "KEYVALDB_PASSWORD")"
fi

if [ -f "$API_APP_ENV" ]; then
	upsert_always "$HOME_SECRETS" "AUTH_JWT_SECRET_API" "$(local_secrets_get_var "$API_APP_ENV" "AUTH_JWT_SECRET")"
fi

if [ -f "$MANAGEMENT_API_APP_ENV" ]; then
	upsert_always "$HOME_SECRETS" "AUTH_JWT_SECRET_MANAGEMENT" "$(local_secrets_get_var "$MANAGEMENT_API_APP_ENV" "AUTH_JWT_SECRET")"
fi

echo "Exported repo secrets to $HOME_SECRETS"
