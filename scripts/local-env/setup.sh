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
WEB_SIDECAR_INFRA_ENV="infra/config/local/web-sidecar.env"
MANAGEMENT_WEB_INFRA_ENV="infra/config/local/management-web.env"
MANAGEMENT_WEB_SIDECAR_INFRA_ENV="infra/config/local/management-web-sidecar.env"

API_APP_ENV="apps/api/.env"
WORKERS_APP_ENV="apps/workers/.env"
MANAGEMENT_API_APP_ENV="apps/management-api/.env"
WEB_APP_ENV="apps/web/.env.local"
MANAGEMENT_WEB_APP_ENV="apps/management-web/.env.local"
WEB_APP_SIDECAR_ENV="apps/web/sidecar/.env"
MANAGEMENT_WEB_APP_SIDECAR_ENV="apps/management-web/sidecar/.env"

# Target-file arrays for apply_override (app + infra envs per app)
API_ENV_FILES=("$API_APP_ENV" "$API_INFRA_ENV")
WORKERS_ENV_FILES=("$WORKERS_APP_ENV" "$WORKERS_INFRA_ENV")
API_AND_WORKERS_ENV_FILES=("$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV")
WEB_ENV_FILES=("$WEB_APP_ENV" "$WEB_INFRA_ENV" "$WEB_SIDECAR_INFRA_ENV")
# Overrides go to infra sidecar (Docker) and app sidecar (npm run dev); app sidecar uses localhost only.
WEB_ENV_FILES_APP_AND_SIDECAR=("$WEB_SIDECAR_INFRA_ENV" "$WEB_APP_SIDECAR_ENV")
MANAGEMENT_API_ENV_FILES=("$MANAGEMENT_API_APP_ENV" "$MANAGEMENT_API_INFRA_ENV")
MANAGEMENT_WEB_ENV_FILES=("$MANAGEMENT_WEB_APP_ENV" "$MANAGEMENT_WEB_INFRA_ENV" "$MANAGEMENT_WEB_SIDECAR_INFRA_ENV")
MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR=("$MANAGEMENT_WEB_SIDECAR_INFRA_ENV" "$MANAGEMENT_WEB_APP_SIDECAR_ENV")

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
	local lightning_file="$OVERRIDES_DIR/lightning.env"
	if [ ! -d "$OVERRIDES_DIR" ]; then
		return 0
	fi
	# Source all override files except lightning.env, then lightning.env last.
	# This keeps migration-safe ordering: MetaBoost moved to metaboost.env.example, but existing
	# installs may still define NEXT_PUBLIC_APP_VALUE_METABOOST_* only in lightning.env; sourcing
	# lightning.env last preserves those values over empty assignments in metaboost.env.
	local file
	for file in "$OVERRIDES_DIR"/*.env; do
		[ -f "$file" ] || continue
		[ "$file" = "$lightning_file" ] && continue
		set -a
		# shellcheck disable=SC1090
		. "$file"
		set +a
	done
	if [ -f "$lightning_file" ]; then
		set -a
		# shellcheck disable=SC1090
		. "$lightning_file"
		set +a
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

# Management API: like api/workers, only the infra .env (Docker) uses the compose DB hostname;
# apps/management-api/.env is for `npm run dev` on the host and must use localhost.
set_if_empty_or_equals "$MANAGEMENT_API_INFRA_ENV" "DB_HOST" "podverse_local_db" "localhost"
set_if_empty_or_equals "$MANAGEMENT_API_INFRA_ENV" "DB_PORT" "5432" "5999"
set_if_empty_or_equals "$MANAGEMENT_API_APP_ENV" "DB_HOST" "localhost" "podverse_local_db"
set_if_empty_or_equals "$MANAGEMENT_API_APP_ENV" "DB_PORT" "5432" "5999"

# Ensure DB names so Postgres creates podverse_app / podverse_management on first run (pgAdmin and apps expect these).
set_if_empty "$DB_ENV" "DB_APP_NAME" "podverse_app"
set_if_empty "$DB_ENV" "DB_MANAGEMENT_NAME" "podverse_management"

DB_APP_NAME="$(first_non_empty_or_default "podverse_app" "$DB_ENV:DB_APP_NAME")"
DB_APP_ADMIN_PASSWORD="$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:DB_APP_ADMIN_PASSWORD")"
DB_APP_READ_USER="$(first_non_empty_or_default "podverse_app_read" "$DB_ENV:DB_APP_READ_USER")"
DB_APP_READ_WRITE_USER="$(first_non_empty_or_default "podverse_app_read_write" "$DB_ENV:DB_APP_READ_WRITE_USER")"
DB_MANAGEMENT_NAME="$(first_non_empty_or_default "podverse_management" "$DB_ENV:DB_MANAGEMENT_NAME")"
DB_MANAGEMENT_ADMIN_USER="$(first_non_empty_or_default "postgres_user_management" "$DB_ENV:DB_MANAGEMENT_ADMIN_USER")"
DB_MANAGEMENT_READ_USER="$(first_non_empty_or_default "podverse_management_read" "$DB_ENV:DB_MANAGEMENT_READ_USER")"
DB_MANAGEMENT_READ_WRITE_USER="$(first_non_empty_or_default "podverse_management_read_write" "$DB_ENV:DB_MANAGEMENT_READ_WRITE_USER")"
# DB read/read-write passwords: dynamically generated (hex-only, no chars that need escaping) when empty or placeholder; then assigned to infra + app env files.
DB_APP_READ_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:DB_APP_READ_PASSWORD")" "your_read_password" "your_read_write_password")"
DB_APP_READ_WRITE_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:DB_APP_READ_WRITE_PASSWORD")" "your_read_password" "your_read_write_password")"
DB_MANAGEMENT_ADMIN_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:DB_MANAGEMENT_ADMIN_PASSWORD")" "your_postgres_password")"
DB_MANAGEMENT_READ_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:DB_MANAGEMENT_READ_PASSWORD")" "your_read_password" "your_read_write_password")"
DB_MANAGEMENT_READ_WRITE_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$DB_ENV:DB_MANAGEMENT_READ_WRITE_PASSWORD")" "your_read_password" "your_read_write_password")"
ARTEMIS_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$MQ_ENV:ARTEMIS_PASSWORD" "$API_APP_ENV:MESSAGE_QUEUE_PASSWORD" "$WORKERS_APP_ENV:MESSAGE_QUEUE_PASSWORD" "$API_INFRA_ENV:MESSAGE_QUEUE_PASSWORD" "$WORKERS_INFRA_ENV:MESSAGE_QUEUE_PASSWORD")" "your_mq_password")"
KEYVALDB_PASSWORD="$(generate_if_empty_or_placeholder "$(first_non_empty_or_generate generate_hex_32 "$KEYVALDB_ENV:KEYVALDB_PASSWORD" "$API_APP_ENV:KEYVALDB_PASSWORD" "$WORKERS_APP_ENV:KEYVALDB_PASSWORD" "$API_INFRA_ENV:KEYVALDB_PASSWORD" "$WORKERS_INFRA_ENV:KEYVALDB_PASSWORD")" "your_redis_password" "# required" " # required")"
# Podcast Index keys are never auto-generated; only populated from override (e.g. podcast-index.env in ~/.config).
# API and management-api use different JWT secrets (so Podverse and Boilerplate each have distinct API vs management JWTs).
AUTH_JWT_SECRET_API="$(first_non_empty_or_generate generate_uuid "$API_APP_ENV:AUTH_JWT_SECRET" "$API_INFRA_ENV:AUTH_JWT_SECRET")"
AUTH_JWT_SECRET_MANAGEMENT="$(first_non_empty_or_generate generate_uuid "$MANAGEMENT_API_APP_ENV:AUTH_JWT_SECRET" "$MANAGEMENT_API_INFRA_ENV:AUTH_JWT_SECRET")"

# Core infra secrets (DB_APP_NAME comes from env-templates: podverse_app / podverse_management)
upsert_var "$DB_ENV" "DB_APP_ADMIN_PASSWORD" "$DB_APP_ADMIN_PASSWORD"
upsert_var "$DB_ENV" "DB_APP_READ_USER" "$DB_APP_READ_USER"
upsert_var "$DB_ENV" "DB_APP_READ_PASSWORD" "$DB_APP_READ_PASSWORD"
upsert_var "$DB_ENV" "DB_APP_READ_WRITE_USER" "$DB_APP_READ_WRITE_USER"
upsert_var "$DB_ENV" "DB_APP_READ_WRITE_PASSWORD" "$DB_APP_READ_WRITE_PASSWORD"

upsert_var "$DB_ENV" "DB_MANAGEMENT_NAME" "$DB_MANAGEMENT_NAME"
upsert_var "$DB_ENV" "DB_MANAGEMENT_ADMIN_USER" "$DB_MANAGEMENT_ADMIN_USER"
upsert_var "$DB_ENV" "DB_MANAGEMENT_ADMIN_PASSWORD" "$DB_MANAGEMENT_ADMIN_PASSWORD"
upsert_var "$DB_ENV" "DB_MANAGEMENT_READ_USER" "$DB_MANAGEMENT_READ_USER"
upsert_var "$DB_ENV" "DB_MANAGEMENT_READ_PASSWORD" "$DB_MANAGEMENT_READ_PASSWORD"
upsert_var "$DB_ENV" "DB_MANAGEMENT_READ_WRITE_USER" "$DB_MANAGEMENT_READ_WRITE_USER"
upsert_var "$DB_ENV" "DB_MANAGEMENT_READ_WRITE_PASSWORD" "$DB_MANAGEMENT_READ_WRITE_PASSWORD"

set_if_empty "$MQ_ENV" "ARTEMIS_USER" "user"
upsert_var "$MQ_ENV" "ARTEMIS_PASSWORD" "$ARTEMIS_PASSWORD"

upsert_var "$KEYVALDB_ENV" "KEYVALDB_PASSWORD" "$KEYVALDB_PASSWORD"

# Shared app-level sync (App DB: names + passwords so app matches init script)
for file in "$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV"; do
	upsert_var "$file" "DB_APP_NAME" "$DB_APP_NAME"
	upsert_var "$file" "DB_APP_READ_USER" "$DB_APP_READ_USER"
	upsert_var "$file" "DB_APP_READ_PASSWORD" "$DB_APP_READ_PASSWORD"
	upsert_var "$file" "DB_APP_READ_WRITE_USER" "$DB_APP_READ_WRITE_USER"
	upsert_var "$file" "DB_APP_READ_WRITE_PASSWORD" "$DB_APP_READ_WRITE_PASSWORD"
done
for file in "$MANAGEMENT_API_APP_ENV" "$MANAGEMENT_API_INFRA_ENV"; do
	upsert_var "$file" "DB_MANAGEMENT_NAME" "$DB_MANAGEMENT_NAME"
	upsert_var "$file" "DB_MANAGEMENT_READ_USER" "$DB_MANAGEMENT_READ_USER"
	upsert_var "$file" "DB_MANAGEMENT_READ_PASSWORD" "$DB_MANAGEMENT_READ_PASSWORD"
	upsert_var "$file" "DB_MANAGEMENT_READ_WRITE_USER" "$DB_MANAGEMENT_READ_WRITE_USER"
	upsert_var "$file" "DB_MANAGEMENT_READ_WRITE_PASSWORD" "$DB_MANAGEMENT_READ_WRITE_PASSWORD"
	upsert_var "$file" "DB_APP_NAME" "$DB_APP_NAME"
	upsert_var "$file" "DB_APP_READ_USER" "$DB_APP_READ_USER"
	upsert_var "$file" "DB_APP_READ_PASSWORD" "$DB_APP_READ_PASSWORD"
	upsert_var "$file" "DB_APP_READ_WRITE_USER" "$DB_APP_READ_WRITE_USER"
	upsert_var "$file" "DB_APP_READ_WRITE_PASSWORD" "$DB_APP_READ_WRITE_PASSWORD"
done

for file in "$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV"; do
	upsert_var "$file" "KEYVALDB_PASSWORD" "$KEYVALDB_PASSWORD"
	upsert_var "$file" "MESSAGE_QUEUE_USERNAME" "user"
	upsert_var "$file" "MESSAGE_QUEUE_PASSWORD" "$ARTEMIS_PASSWORD"
done

for file in "$API_APP_ENV" "$WORKERS_APP_ENV" "$API_INFRA_ENV" "$WORKERS_INFRA_ENV"; do
	upsert_var "$file" "AUTH_JWT_SECRET" "$AUTH_JWT_SECRET_API"
done
for file in "$MANAGEMENT_API_APP_ENV" "$MANAGEMENT_API_INFRA_ENV"; do
	upsert_var "$file" "AUTH_JWT_SECRET" "$AUTH_JWT_SECRET_MANAGEMENT"
done

for file in "$WORKERS_APP_ENV" "$WORKERS_INFRA_ENV"; do
	set_if_empty "$file" "WEBPUSH_VAPID_SUBJECT" "mailto:contact@example.com"
done

# Manual/private override values (each block from one override file)
# From add-by-rss.env
apply_override "ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY" "${API_AND_WORKERS_ENV_FILES[@]}"

# From podcast-index.env (API + Workers; override generated placeholders with real keys here)
for v in PODCAST_INDEX_AUTH_KEY PODCAST_INDEX_SECRET_KEY; do
	apply_override "$v" "${API_AND_WORKERS_ENV_FILES[@]}"
done

# From app.env (LOG_DIR, ACCOUNT_SIGNUP_MODE)
apply_override "LOG_DIR" "${API_ENV_FILES[@]}" "${WORKERS_ENV_FILES[@]}" "${MANAGEMENT_API_ENV_FILES[@]}"
apply_override "ACCOUNT_SIGNUP_MODE" "${API_ENV_FILES[@]}"
# Sync API's effective ACCOUNT_SIGNUP_MODE to web/sidecar so both use the same .config value (app.env or template default).
ACCOUNT_SIGNUP_MODE_EFFECTIVE="$(first_non_empty_or_default "admin_only_email" "$API_APP_ENV:ACCOUNT_SIGNUP_MODE" "$API_INFRA_ENV:ACCOUNT_SIGNUP_MODE")"
for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
	upsert_var "$file" "NEXT_PUBLIC_ACCOUNT_SIGNUP_MODE" "$ACCOUNT_SIGNUP_MODE_EFFECTIVE"
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
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		[ -f "$file" ] && upsert_var "$file" "NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY" "$WEBPUSH_VAPID_PUBLIC_KEY"
	done
fi

# From mailer.env + paypal.env
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
	apply_override "$v" "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"
done

# From brand.env: api/web = BRAND_NAME; mgmt api/mgmt web = MANAGEMENT_BRAND_NAME. Do not set NEXT_PUBLIC_BRAND_NAME in overrides.
apply_override "BRAND_NAME" "${API_AND_WORKERS_ENV_FILES[@]}"

if [ -n "${BRAND_NAME:-}" ]; then
	upsert_var "$API_APP_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/API/5"
	upsert_var "$API_INFRA_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/API/5"
	upsert_var "$WORKERS_APP_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/Workers/5"
	upsert_var "$WORKERS_INFRA_ENV" "USER_AGENT" "${BRAND_NAME} Bot Local/Workers/5"
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		[ -f "$file" ] && upsert_var "$file" "NEXT_PUBLIC_BRAND_NAME" "$BRAND_NAME"
		[ -f "$file" ] && upsert_var "$file" "NEXT_PUBLIC_PROXY_USER_AGENT" "${BRAND_NAME} Bot Local/Web-API/5"
	done
fi
if [ -n "${MANAGEMENT_BRAND_NAME:-}" ]; then
	upsert_var "$MANAGEMENT_API_APP_ENV" "BRAND_NAME" "$MANAGEMENT_BRAND_NAME"
	upsert_var "$MANAGEMENT_API_INFRA_ENV" "BRAND_NAME" "$MANAGEMENT_BRAND_NAME"
	upsert_var "$MANAGEMENT_API_APP_ENV" "USER_AGENT" "${MANAGEMENT_BRAND_NAME} Bot Local/Management-API/5"
	upsert_var "$MANAGEMENT_API_INFRA_ENV" "USER_AGENT" "${MANAGEMENT_BRAND_NAME} Bot Local/Management-API/5"
	for file in "${MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_BRAND_NAME" "$MANAGEMENT_BRAND_NAME"
	done
fi

# From brand.env: BRAND_DOMAIN -> NEXT_PUBLIC_BRAND_DOMAIN for web and management-web sidecars.
if [ -n "${BRAND_DOMAIN:-}" ]; then
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}" "${MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_BRAND_DOMAIN" "$BRAND_DOMAIN"
	done
fi

# From brand.env: BRAND_LOGO_DARK/LIGHT -> NEXT_PUBLIC_BRAND_LOGO_DARK/LIGHT for web sidecars.
if [ -n "${BRAND_LOGO_DARK:-}" ]; then
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_BRAND_LOGO_DARK" "$BRAND_LOGO_DARK"
	done
fi
if [ -n "${BRAND_LOGO_LIGHT:-}" ]; then
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_BRAND_LOGO_LIGHT" "$BRAND_LOGO_LIGHT"
	done
fi

# From locale.env: one place for DEFAULT_LOCALE and SUPPORTED_LOCALES; setup applies to web and management-web (NEXT_PUBLIC_FEATURES_*).
if [ -n "${DEFAULT_LOCALE:-}" ]; then
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}" "${MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_FEATURES_DEFAULT_LOCALE" "$DEFAULT_LOCALE"
	done
fi
if [ -n "${SUPPORTED_LOCALES:-}" ]; then
	for file in "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}" "${MANAGEMENT_WEB_ENV_FILES_APP_AND_SIDECAR[@]}"; do
		upsert_var "$file" "NEXT_PUBLIC_FEATURES_SUPPORTED_LOCALES" "$SUPPORTED_LOCALES"
	done
fi

# From lightning.env
for v in NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_NAME NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_ADDRESS NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_KEY NEXT_PUBLIC_APP_VALUE_LIGHTNING_NODE_CUSTOM_VALUE NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_NAME NEXT_PUBLIC_APP_VALUE_LIGHTNING_LNADDRESS_ADDRESS; do
	apply_override "$v" "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"
done

# From metaboost.env
for v in NEXT_PUBLIC_APP_VALUE_METABOOST_STANDARD NEXT_PUBLIC_APP_VALUE_METABOOST_NODE; do
	apply_override "$v" "${WEB_ENV_FILES_APP_AND_SIDECAR[@]}"
done
for v in METABOOST_SIGNING_KEY_PEM METABOOST_APP_ASSERTION_ISS; do
	apply_override "$v" "${API_ENV_FILES[@]}"
done

# Docker-only: infra env used by Compose gets production NODE_ENV and service-name URLs.
# Run after all overrides so infra files always get these values when used by Compose.
upsert_var "$API_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$WORKERS_INFRA_ENV" "NODE_ENV" "production"
upsert_var "$MANAGEMENT_API_INFRA_ENV" "NODE_ENV" "production"
# Web and management-web (Next.js) main container env: only RUNTIME_CONFIG_URL (app fetches config from sidecar).
upsert_var "$WEB_INFRA_ENV" "RUNTIME_CONFIG_URL" "http://podverse_local_web_runtime_config:3001"
upsert_var "$MANAGEMENT_WEB_INFRA_ENV" "RUNTIME_CONFIG_URL" "http://podverse_local_management_web_runtime_config:3101"
upsert_var "$WEB_SIDECAR_INFRA_ENV" "NEXT_PUBLIC_SSR_API_HOST" "podverse_local_api"
upsert_var "$WEB_SIDECAR_INFRA_ENV" "NEXT_PUBLIC_SSR_API_PORT" "3000"
upsert_var "$MANAGEMENT_WEB_SIDECAR_INFRA_ENV" "NEXT_PUBLIC_SSR_API_HOST" "podverse_local_management_api"
upsert_var "$MANAGEMENT_WEB_SIDECAR_INFRA_ENV" "NEXT_PUBLIC_SSR_API_PORT" "3100"

# App sidecar .env is for npm run dev only; use localhost, never Docker container names.
[ -f "$WEB_APP_SIDECAR_ENV" ] && upsert_var "$WEB_APP_SIDECAR_ENV" "NEXT_PUBLIC_SSR_API_HOST" "localhost"
[ -f "$MANAGEMENT_WEB_APP_SIDECAR_ENV" ] && upsert_var "$MANAGEMENT_WEB_APP_SIDECAR_ENV" "NEXT_PUBLIC_SSR_API_HOST" "localhost"

# Sidecars do not use NODE_ENV; remove it if present (e.g. from an older setup).
for file in "$WEB_SIDECAR_INFRA_ENV" "$MANAGEMENT_WEB_SIDECAR_INFRA_ENV"; do
	if [ -f "$file" ] && grep -q -E '^NODE_ENV=' "$file" 2>/dev/null; then
		sed -i.bak '/^NODE_ENV=/d' "$file"
		rm -f "${file}.bak"
	fi
done

# .env.local: only RUNTIME_CONFIG_URL (Next.js app uses it to fetch config from sidecar).
printf '%s\n' '#####' '##### Runtime Config Sidecar' '#####' "RUNTIME_CONFIG_URL=\"http://localhost:3001\"" >"$WEB_APP_ENV"
printf '%s\n' '#####' '##### Runtime Config Sidecar' '#####' "RUNTIME_CONFIG_URL=\"http://localhost:3101\"" >"$MANAGEMENT_WEB_APP_ENV"

echo "Applied local env values from generated defaults and overrides."
