#!/usr/bin/env bash
# Shared helpers for ~/.config/podverse/local-env-overrides/local-secrets.env
# Sourced by setup.sh and persist/migrate scripts (not executed directly).

local_secrets_home_overrides_dir() {
	if [ -n "${PODVERSE_HOME_OVERRIDES_DIR:-}" ]; then
		printf '%s' "${PODVERSE_HOME_OVERRIDES_DIR/#\~/$HOME}"
		return 0
	fi
	printf '%s/.config/podverse/local-env-overrides' "${HOME:-}"
}

local_secrets_home_file() {
	printf '%s/local-secrets.env' "$(local_secrets_home_overrides_dir)"
}

local_secrets_is_placeholder() {
	case "$1" in
	'' | your_postgres_password | your_read_password | your_read_write_password | your_mq_password | your_redis_password | '# required' | ' # required')
		return 0
		;;
	*)
		return 1
		;;
	esac
}

local_secrets_get_var() {
	local file="$1"
	local var="$2"
	local line val

	[ -f "$file" ] || return 0
	line="$(grep -E "^${var}=" "$file" 2>/dev/null | head -n 1 || true)"
	[ -n "$line" ] || return 0
	val="${line#*=}"
	val="${val%\"}"
	val="${val#\"}"
	val="${val%\'}"
	val="${val#\'}"
	printf '%s' "$val"
}

local_secrets_upsert_var_if_empty() {
	local file="$1"
	local var="$2"
	local value="${3-}"
	local current replacement escaped

	[ -n "$value" ] || return 0
	mkdir -p "$(dirname "$file")"
	touch "$file"

	current="$(local_secrets_get_var "$file" "$var")"
	if [ -n "$current" ] && ! local_secrets_is_placeholder "$current"; then
		return 0
	fi

	escaped="$(printf '%s' "$value" | sed -e 's/[\/&]/\\&/g')"
	if [ -z "$value" ]; then
		replacement="${var}="
	else
		replacement="${var}=\"${escaped}\""
	fi

	if grep -q -E "^${var}=" "$file" 2>/dev/null; then
		sed -i.bak "s|^${var}=.*|${replacement}|" "$file"
		rm -f "${file}.bak"
	else
		printf '%s\n' "$replacement" >>"$file"
	fi
}

local_secrets_override_value() {
	local var_name="$1"
	local value="${!var_name:-}"

	if [ -n "$value" ] && ! local_secrets_is_placeholder "$value"; then
		printf '%s' "$value"
		return 0
	fi
	return 1
}

local_secrets_var_names() {
	printf '%s\n' \
		DB_APP_OWNER_PASSWORD \
		DB_APP_MIGRATOR_PASSWORD \
		DB_APP_READ_PASSWORD \
		DB_APP_READ_WRITE_PASSWORD \
		DB_MANAGEMENT_OWNER_PASSWORD \
		DB_MANAGEMENT_MIGRATOR_PASSWORD \
		DB_MANAGEMENT_READ_PASSWORD \
		DB_MANAGEMENT_READ_WRITE_PASSWORD \
		ARTEMIS_PASSWORD \
		KEYVALDB_PASSWORD \
		AUTH_JWT_SECRET_API \
		AUTH_JWT_SECRET_MANAGEMENT
}
