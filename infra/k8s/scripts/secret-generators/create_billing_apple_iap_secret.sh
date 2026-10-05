#!/usr/bin/env bash
# VERSION: 1
# SOPS Secret podverse-billing-apple-iap-opaque: App Store Server API .p8 key.
# Mounted read-only at /var/secrets/apple-iap (key AuthKey.p8).
# Set APPLE_IAP_PRIVATE_KEY_PATH=/var/secrets/apple-iap/AuthKey.p8 with the other
# Apple credential keys when this secret is applied. See docs/billing/BILLING.md.

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

echo "Running create_billing_apple_iap_secret.sh - Version: 1"

read -r -p "Enter environment [alpha]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-billing-apple-iap-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-billing-apple-iap-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

echo "Path to the App Store Connect .p8 (AuthKey_*.p8). Do not paste its contents."
read -r -e -p "Path: " FILE_PATH

if [ ! -f "$FILE_PATH" ]; then
	echo "Error: File not found at ${FILE_PATH}"
	exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Reading file and encrypting secret..."

TMP_YAML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/billing-apple-iap-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_YAML_DIR}/podverse-billing-apple-iap-opaque.yaml"
trap 'rm -rf "$TMP_YAML_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-file=AuthKey.p8="${FILE_PATH}" \
	--dry-run=client -o yaml >"${TMP_FILE}"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "${TMP_FILE}" >"${OUTPUT_FILE}"

rm -rf "$TMP_YAML_DIR"
trap - EXIT

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Mount path: /var/secrets/apple-iap/AuthKey.p8"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
