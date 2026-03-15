#!/usr/bin/env bash

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

OVERRIDES_DIR="dev/env-overrides/local"

DB_ENV="infra/config/local/db.env"
MQ_ENV="infra/config/local/mq.env"
KEYVALDB_ENV="infra/config/local/keyvaldb.env"
API_INFRA_ENV="infra/config/local/api.env"
WORKERS_INFRA_ENV="infra/config/local/workers.env"
MANAGEMENT_API_INFRA_ENV="infra/config/local/management-api.env"
WEB_INFRA_ENV="infra/config/local/web.env"
MANAGEMENT_WEB_INFRA_ENV="infra/config/local/management-web.env"

API_APP_ENV="apps/api/.env"
WORKERS_APP_ENV="apps/workers/.env"
MANAGEMENT_API_APP_ENV="apps/management-api/.env"
WEB_APP_ENV="apps/web/.env.local"
MANAGEMENT_WEB_APP_ENV="apps/management-web/.env.local"

# Target-file arrays for apply_override (app + infra envs per app)
API_ENV_FILES=("$API_APP_ENV" "$API_INFRA_ENV")
WORKERS_ENV_FILES=("$WORKERS_APP_ENV" "$WORKERS_INFRA_ENV")
API_AND_WORKERS_ENV_FILES=("$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV")
WEB_ENV_FILES=("$WEB_APP_ENV" "$WEB_INFRA_ENV")
MANAGEMENT_API_ENV_FILES=("$MANAGEMENT_API_APP_ENV" "$MANAGEMENT_API_INFRA_ENV")
MANAGEMENT_WEB_ENV_FILES=("$MANAGEMENT_WEB_APP_ENV" "$MANAGEMENT_WEB_INFRA_ENV")

escape_sed_replacement() {
	printf '%s' "$1" | sed -e 's/[\/&]/\\&/g'
}

trim_quotes() {
	local value="$1"
	value="${value%\"}"
	value="${value#\"}"
	value="${value%\'}"
	value="${value#\'}"
	printf '%s' "$value"
}

get_var() {
	local file="$1"
	local var="$2"
	local line

	[ -f "$file" ] || return 0
	line="$(grep -E "^${var}=" "$file" 2>/dev/null | head -n 1 || true)"
	[ -n "$line" ] || return 0
	trim_quotes "${line#*=}"
}

upsert_var() {
	local file="$1"
	local var="$2"
	local value="${3-}"
	local replacement

	[ -f "$file" ] || return 0

	if [ -z "$value" ]; then
		replacement="${var}="
	else
		replacement="${var}=\"$(escape_sed_replacement "$value")\""
	fi

	if grep -q -E "^${var}=" "$file" 2>/dev/null; then
		sed -i.bak "s|^${var}=.*|${replacement}|" "$file"
		rm -f "${file}.bak"
	else
		echo "$replacement" >>"$file"
	fi
}

set_if_empty() {
	local file="$1"
	local var="$2"
	local value="${3-}"
	local current

	current="$(get_var "$file" "$var")"
	if [ -z "$current" ]; then
		upsert_var "$file" "$var" "$value"
	fi
}

set_if_empty_or_equals() {
	local file="$1"
	local var="$2"
	local value="$3"
	local equals_value="$4"
	local current

	current="$(get_var "$file" "$var")"
	if [ -z "$current" ] || [ "$current" = "$equals_value" ]; then
		upsert_var "$file" "$var" "$value"
	fi
}

first_non_empty_or_generate() {
	local generator="$1"
	shift
	local pair file var current
	for pair in "$@"; do
		file="${pair%%:*}"
		var="${pair#*:}"
		current="$(get_var "$file" "$var")"
		if [ -n "$current" ]; then
			printf '%s' "$current"
			return 0
		fi
	done
	"$generator"
}

first_non_empty_or_default() {
	local default_value="$1"
	shift
	local pair file var current
	for pair in "$@"; do
		file="${pair%%:*}"
		var="${pair#*:}"
		current="$(get_var "$file" "$var")"
		if [ -n "$current" ]; then
			printf '%s' "$current"
			return 0
		fi
	done
	printf '%s' "$default_value"
}

# If value is empty or one of the placeholders, generate a secure value; otherwise return as-is.
generate_if_empty_or_placeholder() {
	local value="$1"
	shift
	local p
	if [ -z "$value" ]; then
		generate_base64_32
		return 0
	fi
	for p in "$@"; do
		if [ "$value" = "$p" ]; then
			generate_base64_32
			return 0
		fi
	done
	printf '%s' "$value"
}

generate_base64_32() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -base64 32 | tr -d '\n'
		return 0
	fi
	node -e "console.log(require('node:crypto').randomBytes(32).toString('base64'))"
}

generate_hex_32() {
	if command -v openssl >/dev/null 2>&1; then
		openssl rand -hex 32 | tr -d '\n'
		return 0
	fi
	node -e "console.log(require('node:crypto').randomBytes(32).toString('hex'))"
}

generate_uuid() {
	if command -v uuidgen >/dev/null 2>&1; then
		uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '\n'
		return 0
	fi
	node -e "console.log(require('node:crypto').randomUUID())"
}

load_overrides() {
	if [ -d "$OVERRIDES_DIR" ]; then
		for file in "$OVERRIDES_DIR"/*.env; do
			[ -f "$file" ] || continue
			set -a
			# shellcheck disable=SC1090
			. "$file"
			set +a
		done
	fi
}

apply_override() {
	local var="$1"
	shift
	local value="${!var:-}"
	local file

	[ -n "$value" ] || return 0
	for file in "$@"; do
		upsert_var "$file" "$var" "$value"
	done
}

load_overrides

# Keep infra docker env files container-friendly on initial setup.
set_if_empty_or_equals "$API_INFRA_ENV" "DB_HOST" "podverse_local_db" "localhost"
set_if_empty_or_equals "$API_INFRA_ENV" "DB_PORT" "5432" "5432"
set_if_empty_or_equals "$API_INFRA_ENV" "KEYVALDB_HOST" "podverse_local_keyvaldb" "localhost"
set_if_empty_or_equals "$API_INFRA_ENV" "KEYVALDB_PORT" "6379" "6379"
set_if_empty_or_equals "$API_INFRA_ENV" "MESSAGE_QUEUE_HOST" "podverse_local_mq" "localhost"

set_if_empty_or_equals "$WORKERS_INFRA_ENV" "DB_HOST" "podverse_local_db" "localhost"
set_if_empty_or_equals "$WORKERS_INFRA_ENV" "DB_PORT" "5432" "5432"
set_if_empty_or_equals "$WORKERS_INFRA_ENV" "KEYVALDB_HOST" "podverse_local_keyvaldb" "localhost"
set_if_empty_or_equals "$WORKERS_INFRA_ENV" "KEYVALDB_PORT" "6379" "6379"
set_if_empty_or_equals "$WORKERS_INFRA_ENV" "MESSAGE_QUEUE_HOST" "podverse_local_mq" "localhost"
set_if_empty_or_equals "$WORKERS_INFRA_ENV" "MESSAGE_QUEUE_PORT" "5672" "5672"

set_if_empty_or_equals "$MANAGEMENT_API_INFRA_ENV" "DB_HOST" "podverse_local_db" "localhost"
set_if_empty_or_equals "$MANAGEMENT_API_INFRA_ENV" "DB_PORT" "5432" "5999"

# Ensure DB names so Postgres creates podverse_app / podverse_management on first run (pgAdmin and apps expect these).
set_if_empty "$DB_ENV" "POSTGRES_DB" "podverse_app"
set_if_empty "$DB_ENV" "POSTGRES_MANAGEMENT_DB" "podverse_management"

POSTGRES_DB="$(first_non_empty_or_default "podverse_app" "$DB_ENV:POSTGRES_DB")"
POSTGRES_PASSWORD="$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:POSTGRES_PASSWORD")"
POSTGRES_READ_USER="$(first_non_empty_or_default "podverse_app_read" "$DB_ENV:POSTGRES_READ_USER")"
POSTGRES_READ_WRITE_USER="$(first_non_empty_or_default "podverse_app_read_write" "$DB_ENV:POSTGRES_READ_WRITE_USER")"
POSTGRES_MANAGEMENT_DB="$(first_non_empty_or_default "podverse_management" "$DB_ENV:POSTGRES_MANAGEMENT_DB")"
POSTGRES_MANAGEMENT_USER="$(first_non_empty_or_default "postgres_user_management" "$DB_ENV:POSTGRES_MANAGEMENT_USER")"
POSTGRES_MANAGEMENT_READ_USER="$(first_non_empty_or_default "podverse_management_read" "$DB_ENV:POSTGRES_MANAGEMENT_READ_USER")"
POSTGRES_MANAGEMENT_READ_WRITE_USER="$(first_non_empty_or_default "podverse_management_read_write" "$DB_ENV:POSTGRES_MANAGEMENT_READ_WRITE_USER")"
# DB read/read-write passwords: dynamically generated (hex-only, no chars that need escaping) when empty or placeholder; then assigned to infra + app env files.
POSTGRES_READ_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:POSTGRES_READ_PASSWORD")" "your_read_password" "your_read_write_password")"
POSTGRES_READ_WRITE_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:POSTGRES_READ_WRITE_PASSWORD")" "your_read_password" "your_read_write_password")"
POSTGRES_MANAGEMENT_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:POSTGRES_MANAGEMENT_PASSWORD")" "your_postgres_password")"
POSTGRES_MANAGEMENT_READ_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:POSTGRES_MANAGEMENT_READ_PASSWORD")" "your_read_password" "your_read_write_password")"
POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD")" "your_read_password" "your_read_write_password")"
ARTEMIS_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$MQ_ENV:ARTEMIS_PASSWORD" "$API_APP_ENV:MESSAGE_QUEUE_PASSWORD" "$WORKERS_APP_ENV:MESSAGE_QUEUE_PASSWORD" "$API_INFRA_ENV:MESSAGE_QUEUE_PASSWORD" "$WORKERS_INFRA_ENV:MESSAGE_QUEUE_PASSWORD")" "your_mq_password")"
KEYVALDB_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$KEYVALDB_ENV:KEYVALDB_PASSWORD" "$API_APP_ENV:KEYVALDB_PASSWORD" "$WORKERS_APP_ENV:KEYVALDB_PASSWORD" "$API_INFRA_ENV:KEYVALDB_PASSWORD" "$WORKERS_INFRA_ENV:KEYVALDB_PASSWORD")" "your_redis_password" "# required" " # required")"
PODCAST_INDEX_AUTH_KEY="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_base64_32 "$API_APP_ENV:PODCAST_INDEX_AUTH_KEY" "$WORKERS_APP_ENV:PODCAST_INDEX_AUTH_KEY" "$API_INFRA_ENV:PODCAST_INDEX_AUTH_KEY" "$WORKERS_INFRA_ENV:PODCAST_INDEX_AUTH_KEY")" "your_podcast_index_auth_key" "test")"
PODCAST_INDEX_SECRET_KEY="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_base64_32 "$API_APP_ENV:PODCAST_INDEX_SECRET_KEY" "$WORKERS_APP_ENV:PODCAST_INDEX_SECRET_KEY" "$API_INFRA_ENV:PODCAST_INDEX_SECRET_KEY" "$WORKERS_INFRA_ENV:PODCAST_INDEX_SECRET_KEY")" "your_podcast_index_secret_key" "test")"
AUTH_JWT_SECRET="$(first_non_empty_or_generate generate_uuid "$API_APP_ENV:AUTH_JWT_SECRET" "$MANAGEMENT_API_APP_ENV:AUTH_JWT_SECRET")"

# Core infra secrets (POSTGRES_DB comes from env-templates: podverse_app / podverse_management)
upsert_var "$DB_ENV" "POSTGRES_PASSWORD" "$POSTGRES_PASSWORD"
upsert_var "$DB_ENV" "POSTGRES_READ_USER" "$POSTGRES_READ_USER"
upsert_var "$DB_ENV" "POSTGRES_READ_PASSWORD" "$POSTGRES_READ_PASSWORD"
upsert_var "$DB_ENV" "POSTGRES_READ_WRITE_USER" "$POSTGRES_READ_WRITE_USER"
upsert_var "$DB_ENV" "POSTGRES_READ_WRITE_PASSWORD" "$POSTGRES_READ_WRITE_PASSWORD"

upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_DB" "$POSTGRES_MANAGEMENT_DB"
upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_USER" "$POSTGRES_MANAGEMENT_USER"
upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_PASSWORD" "$POSTGRES_MANAGEMENT_PASSWORD"
upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_READ_USER" "$POSTGRES_MANAGEMENT_READ_USER"
upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_READ_PASSWORD" "$POSTGRES_MANAGEMENT_READ_PASSWORD"
upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_READ_WRITE_USER" "$POSTGRES_MANAGEMENT_READ_WRITE_USER"
upsert_var "$DB_ENV" "POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD" "$POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD"

set_if_empty "$MQ_ENV" "ARTEMIS_USER" "user"
upsert_var "$MQ_ENV" "ARTEMIS_PASSWORD" "$ARTEMIS_PASSWORD"

upsert_var "$KEYVALDB_ENV" "KEYVALDB_PASSWORD" "$KEYVALDB_PASSWORD"

# Shared app-level sync (App DB: names + passwords so app matches init script)
for file in "$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV"; do
	upsert_var "$file" "DB_DATABASE" "$POSTGRES_DB"
	upsert_var "$file" "DB_READ_USERNAME" "$POSTGRES_READ_USER"
	upsert_var "$file" "DB_READ_PASSWORD" "$POSTGRES_READ_PASSWORD"
	upsert_var "$file" "DB_READ_WRITE_USERNAME" "$POSTGRES_READ_WRITE_USER"
	upsert_var "$file" "DB_READ_WRITE_PASSWORD" "$POSTGRES_READ_WRITE_PASSWORD"
done
for file in "$MANAGEMENT_API_APP_ENV" "$MANAGEMENT_API_INFRA_ENV"; do
	upsert_var "$file" "DB_DATABASE" "$POSTGRES_MANAGEMENT_DB"
	upsert_var "$file" "DB_READ_USERNAME" "$POSTGRES_MANAGEMENT_READ_USER"
	upsert_var "$file" "DB_READ_PASSWORD" "$POSTGRES_MANAGEMENT_READ_PASSWORD"
	upsert_var "$file" "DB_READ_WRITE_USERNAME" "$POSTGRES_MANAGEMENT_READ_WRITE_USER"
	upsert_var "$file" "DB_READ_WRITE_PASSWORD" "$POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD"
done

for file in "$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV"; do
	upsert_var "$file" "KEYVALDB_PASSWORD" "$KEYVALDB_PASSWORD"
	upsert_var "$file" "MESSAGE_QUEUE_USERNAME" "user"
	upsert_var "$file" "MESSAGE_QUEUE_PASSWORD" "$ARTEMIS_PASSWORD"
	upsert_var "$file" "PODCAST_INDEX_AUTH_KEY" "$PODCAST_INDEX_AUTH_KEY"
	upsert_var "$file" "PODCAST_INDEX_SECRET_KEY" "$PODCAST_INDEX_SECRET_KEY"
done

for file in "$API_APP_ENV" "$MANAGEMENT_API_APP_ENV" "$API_INFRA_ENV" "$MANAGEMENT_API_INFRA_ENV"; do
	upsert_var "$file" "AUTH_JWT_SECRET" "$AUTH_JWT_SECRET"
done

for file in "$WORKERS_APP_ENV" "$WORKERS_INFRA_ENV"; do
	set_if_empty "$file" "WEBPUSH_VAPID_SUBJECT" "mailto:contact@example.com"
done

# Manual/private override values (each block from one override file)
# From private-services.env
apply_override "ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY" "${API_AND_WORKERS_ENV_FILES[@]}"

# From podcast-index.env
for v in PODCAST_INDEX_AUTH_KEY PODCAST_INDEX_SECRET_KEY; do
	apply_override "$v" "${API_AND_WORKERS_ENV_FILES[@]}"
done

# From storage.env
for v in BUCKET_PROVIDER BUCKET_ACCESS_KEY BUCKET_SECRET_KEY BUCKET_REGION BUCKET_NAME BUCKET_CDN_BASE_URL; do
	apply_override "$v" "${WORKERS_ENV_FILES[@]}"
done

# From notifications.env (VAPID keys filled manually by dev; not auto-generated)
for v in GOOGLE_FIREBASE_NOTIFICATIONS_ENABLED GOOGLE_FIREBASE_ADMIN_JSON_KEY_PATH WEBPUSH_ENABLED WEBPUSH_VAPID_SUBJECT WEBPUSH_VAPID_PUBLIC_KEY WEBPUSH_VAPID_PRIVATE_KEY; do
	apply_override "$v" "${WORKERS_ENV_FILES[@]}"
done
if [ -n "${WEBPUSH_VAPID_PUBLIC_KEY:-}" ]; then
	upsert_var "$WEB_APP_ENV" "NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY" "$WEBPUSH_VAPID_PUBLIC_KEY"
	upsert_var "$WEB_INFRA_ENV" "NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY" "$WEBPUSH_VAPID_PUBLIC_KEY"
fi

# From private-services.env (mailer + PayPal)
for v in MAILER_SERVICE MAILER_HOST MAILER_PORT MAILER_USERNAME MAILER_PASSWORD MAILER_FROM PAYPAL_CLIENT_ID PAYPAL_CLIENT_SECRET; do
	apply_override "$v" "${API_ENV_FILES[@]}"
done

# From email-template.env
for v in EMAIL_BRAND_COLOR EMAIL_HEADER_IMAGE_URL LEGAL_NAME LEGAL_ADDRESS; do
	apply_override "$v" "${API_ENV_FILES[@]}"
done

# From socials.env (API/email template social links)
for v in SOCIAL_FACEBOOK_IMAGE_URL SOCIAL_FACEBOOK_PAGE_URL SOCIAL_GITHUB_IMAGE_URL SOCIAL_GITHUB_PAGE_URL SOCIAL_TWITTER_IMAGE_URL SOCIAL_TWITTER_PAGE_URL SOCIAL_REDDIT_IMAGE_URL SOCIAL_REDDIT_PAGE_URL; do
	apply_override "$v" "${API_ENV_FILES[@]}"
done

# From socials.env (web contact + social links)
for v in NEXT_PUBLIC_CONTACT_EMAIL NEXT_PUBLIC_SOCIAL_ACTIVITY_PUB NEXT_PUBLIC_SOCIAL_DISCORD NEXT_PUBLIC_SOCIAL_GITHUB NEXT_PUBLIC_SOCIAL_MATRIX NEXT_PUBLIC_SOCIAL_X; do
	apply_override "$v" "${WEB_ENV_FILES[@]}"
done

# From management-superuser.env
for v in MANAGEMENT_SUPERUSER_EMAIL MANAGEMENT_SUPERUSER_PASSWORD; do
	apply_override "$v" "$DB_ENV"
done

# From brand.env (API, workers, and management-api all use BRAND_NAME)
apply_override "BRAND_NAME" "${API_AND_WORKERS_ENV_FILES[@]}" "${MANAGEMENT_API_ENV_FILES[@]}"

# Construct USER_AGENT from BRAND_NAME (format: BrandName Bot Local/AppName/5)
if [ -n "${BRAND_NAME:-}" ]; then
	upsert_var "$API_APP_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/API/5"
	upsert_var "$API_INFRA_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/API/5"
	upsert_var "$WORKERS_APP_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/Workers/5"
	upsert_var "$WORKERS_INFRA_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/Workers/5"
	upsert_var "$MANAGEMENT_API_APP_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/Management-API/5"
	upsert_var "$MANAGEMENT_API_INFRA_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/Management-API/5"
	upsert_var "$WEB_APP_ENV" "NEXT_PUBLIC_BRAND_NAME" "$BRAND_NAME"
	upsert_var "$WEB_INFRA_ENV" "NEXT_PUBLIC_BRAND_NAME" "$BRAND_NAME"
	upsert_var "$WEB_APP_ENV" "NEXT_PUBLIC_PROXY_USER_AGENT" "${BRAND_NAME} Bot Local/Web-API/5"
	upsert_var "$WEB_INFRA_ENV" "NEXT_PUBLIC_PROXY_USER_AGENT" "${BRAND_NAME} Bot Local/Web-API/5"
fi
# From brand.env (Management Web: MANAGEMENT_BRAND_NAME → NEXT_PUBLIC_BRAND_NAME)
if [ -n "${MANAGEMENT_BRAND_NAME:-}" ]; then
	for file in "${MANAGEMENT_WEB_ENV_FILES[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_BRAND_NAME" "$MANAGEMENT_BRAND_NAME"
	done
fi

# From lightning.env
for v in NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS; do
	apply_override "$v" "${WEB_ENV_FILES[@]}"
done

# Docker-only: infra env used by Compose gets production NODE_ENV and service-name URLs.
# Run after all overrides so infra files always get these values when used by Compose.
upsert_var "$API_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$WORKERS_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$MANAGEMENT_API_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$WEB_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$MANAGEMENT_WEB_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$WEB_INFRA_ENV" "RUNTIME_CONFIG_URL" "http://podverse_local_web_runtime_config:3001"
upsert_var "$WEB_INFRA_ENV" "NEXT_PUBLIC_SSR_API_HOST" "podverse_local_api"
upsert_var "$WEB_INFRA_ENV" "NEXT_PUBLIC_SSR_API_PORT" "1234"
upsert_var "$MANAGEMENT_WEB_INFRA_ENV" "RUNTIME_CONFIG_URL" "http://podverse_local_management_web_runtime_config:3101"
upsert_var "$MANAGEMENT_WEB_INFRA_ENV" "NEXT_PUBLIC_SSR_API_HOST" "podverse_local_management_api"
upsert_var "$MANAGEMENT_WEB_INFRA_ENV" "NEXT_PUBLIC_SSR_API_PORT" "1999"

echo "Applied local env values from generated defaults and overrides."
