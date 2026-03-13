#!/usr/bin/env bash

set -euo pipefail

usage() {
	cat <<'EOF'
Usage: env-to-yaml.sh <path-to-env-file>

Converts KEY=VALUE lines into YAML-style key/value pairs:
  KEY=VALUE -> KEY: "VALUE"

Notes:
  - Skips blank lines and comments.
  - Escapes double quotes and backslashes in values.
EOF
}

if [[ ${1:-} == '-h' || ${1:-} == '--help' || $# -ne 1 ]]; then
	usage
	exit 1
fi

input_file=$1

if [[ ! -f "$input_file" ]]; then
	echo "Error: file not found: $input_file" >&2
	exit 1
fi

printf '%s\n' "apiVersion: v1"
printf '%s\n' "kind: ConfigMap"
printf '%s\n' "metadata:"
printf '%s\n' "  name: podverse-EXAMPLE-config"
printf '%s\n' "data:"

trim() {
	local value=$1
	value=${value#"${value%%[![:space:]]*}"}
	value=${value%"${value##*[![:space:]]}"}
	printf '%s' "$value"
}

while IFS= read -r line || [[ -n $line ]]; do
	line=${line%$'\r'}

	if [[ -z "${line//[[:space:]]/}" ]]; then
		printf '  \n'
		continue
	fi

	if [[ $line =~ ^[[:space:]]*# ]]; then
		printf '  %s\n' "$line"
		continue
	fi

	if [[ $line != *"="* ]]; then
		echo "Skipping line without '=': $line" >&2
		continue
	fi

	key=${line%%=*}
	value=${line#*=}

	key=$(trim "$key")
	if [[ $key == export* ]]; then
		key=${key#export }
		key=$(trim "$key")
	fi

	if [[ -z $key ]]; then
		echo "Skipping line with empty key: $line" >&2
		continue
	fi

	if [[ $value == '"'*'"' && ${#value} -ge 2 ]]; then
		value=${value:1:${#value}-2}
	elif [[ $value == "'"*"'" && ${#value} -ge 2 ]]; then
		value=${value:1:${#value}-2}
	fi

	value=${value//\\/\\\\}
	value=${value//"/\\"/}

	printf '  %s: "%s"\n' "$key" "$value"
done <"$input_file"

printf '%s\n' "  # vim: set filetype=yaml :"
