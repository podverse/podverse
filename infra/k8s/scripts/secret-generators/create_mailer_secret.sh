#!/usr/bin/env bash
# VERSION: 1
# Encrypted Secret for API SMTP credentials (MAILER_USERNAME / MAILER_PASSWORD).
# Separate from podverse-api-opaque (AUTH_JWT_SECRET only). See create_api_secret.sh.

set -euo pipefail

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

echo "Running create_mailer_secret.sh - Version: 1"

if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-mailer-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-mailer-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

if [ "$AUTO_GEN" = true ]; then
	MAILER_USERNAME=""
	MAILER_PASSWORD=""
	echo "  MAILER_USERNAME: [empty—re-run this script without --auto-gen to set]"
	echo "  MAILER_PASSWORD: [empty—re-run this script without --auto-gen to set]"
else
	echo "--- Mailer (optional: leave blank if not using outbound SMTP) ---"
	read -r -p "Enter MAILER_USERNAME: " MAILER_USERNAME
	read -r -s -p "Enter MAILER_PASSWORD: " MAILER_PASSWORD
	echo ""
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_YAML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/mailer-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_YAML_DIR}/podverse-mailer-opaque.yaml"
trap 'rm -rf "$TMP_YAML_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=MAILER_USERNAME="${MAILER_USERNAME}" \
	--from-literal=MAILER_PASSWORD="${MAILER_PASSWORD}" \
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
