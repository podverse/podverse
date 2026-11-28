#!/usr/bin/env bash
# VERSION: 3
# Encrypted Secret for API auth only (AUTH_JWT_SECRET).
# Mailer: create_mailer_secret.sh. Metaboost App Assertion: create_metaboost_secret.sh.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"

AUTO_GEN=false
OUTPUT_FILE_OVERRIDE=""

while [[ $# -gt 0 ]]; do
	case "${1}" in
	--auto-gen)
		AUTO_GEN=true
		shift
		;;
	--output-file)
		OUTPUT_FILE_OVERRIDE="${2:?--output-file requires a value}"
		shift 2
		;;
	*)
		break
		;;
	esac
done

echo "Running create_api_secret.sh - Version: 3"

if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-api-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-api-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

if [ "$AUTO_GEN" = true ]; then
	echo "Auto-generating AUTH_JWT_SECRET..."
	AUTH_JWT_SECRET=$(uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '\n')
	AUTH_SECOND_FACTOR_KEY=$(openssl rand -hex 32 | tr -d '\n')
	echo "  AUTH_JWT_SECRET: [generated]"
	echo "  AUTH_SECOND_FACTOR_KEY: [generated]"
	echo "  Mailer credentials: run ${SCRIPT_DIR}/create_mailer_secret.sh"
	echo "  Metaboost App Assertion: run ${SCRIPT_DIR}/create_metaboost_secret.sh"
else
	echo "--- AUTH_JWT_SECRET ---"
	read -r -s -p "Enter AUTH_JWT_SECRET (random string): " AUTH_JWT_SECRET
	echo ""
	if [ -z "$AUTH_JWT_SECRET" ]; then
		echo "Error: AUTH_JWT_SECRET is required." >&2
		exit 1
	fi
	read -r -s -p "Enter AUTH_SECOND_FACTOR_KEY (64 hex characters): " AUTH_SECOND_FACTOR_KEY
	echo ""
	if [ -z "$AUTH_SECOND_FACTOR_KEY" ]; then
		echo "Error: AUTH_SECOND_FACTOR_KEY is required." >&2
		exit 1
	fi
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_YAML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/api-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_YAML_DIR}/podverse-api-opaque.yaml"
trap 'rm -rf "$TMP_YAML_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=AUTH_JWT_SECRET="${AUTH_JWT_SECRET}" \
	--from-literal=AUTH_SECOND_FACTOR_KEY="${AUTH_SECOND_FACTOR_KEY}" \
	--dry-run=client -o yaml >"${TMP_FILE}"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "${TMP_FILE}" >"${OUTPUT_FILE}"

rm -rf "$TMP_YAML_DIR"
trap - EXIT

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
echo ""
echo "Mailer (MAILER_USERNAME / MAILER_PASSWORD):"
echo "  bash \"${SCRIPT_DIR}/create_mailer_secret.sh\""
echo "Metaboost (METABOOST_*):"
echo "  bash \"${SCRIPT_DIR}/create_metaboost_secret.sh\""
