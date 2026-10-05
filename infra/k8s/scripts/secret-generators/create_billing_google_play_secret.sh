#!/usr/bin/env bash
# VERSION: 1
# SOPS Secret podverse-billing-google-play-opaque: Play Developer API JSON key.
# Mounted read-only at /var/secrets/google-play (key service-account.json).
# Set GOOGLE_PLAY_SERVICE_ACCOUNT_JSON_PATH=/var/secrets/google-play/service-account.json
# with the other Google credential keys when this secret is applied.
# See docs/billing/BILLING.md.

set -euo pipefail

OUTPUT_FILE_OVERRIDE=""

while [[ $# -gt 0 ]]; do
	case "${1}" in
	--output-file)
		OUTPUT_FILE_OVERRIDE="${2:?--output-file requires a value}"
		shift 2
		;;
	*)
		break
		;;
	esac
done

echo "Running create_billing_google_play_secret.sh - Version: 1"

read -r -p "Enter environment [alpha]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-billing-google-play-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-billing-google-play-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

echo "Path to the Play service-account JSON. Do not paste its contents."
read -r -e -p "Path: " FILE_PATH

if [ ! -f "$FILE_PATH" ]; then
	echo "Error: File not found at ${FILE_PATH}"
	exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Reading file and encrypting secret..."

TMP_YAML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/billing-google-play-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_YAML_DIR}/podverse-billing-google-play-opaque.yaml"
trap 'rm -rf "$TMP_YAML_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-file=service-account.json="${FILE_PATH}" \
	--dry-run=client -o yaml >"${TMP_FILE}"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "${TMP_FILE}" >"${OUTPUT_FILE}"

rm -rf "$TMP_YAML_DIR"
trap - EXIT

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Mount path: /var/secrets/google-play/service-account.json"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
