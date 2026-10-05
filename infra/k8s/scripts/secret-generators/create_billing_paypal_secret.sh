#!/usr/bin/env bash
# VERSION: 1
# SOPS Secret podverse-billing-paypal-opaque: PayPal REST credentials.
# Mounted with envFrom on the API, management API, and worker-billing-renewals.
# Does not support --auto-gen. See docs/billing/BILLING.md.

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

echo "Running create_billing_paypal_secret.sh - Version: 1"

read -r -p "Enter environment [alpha]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-billing-paypal-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-billing-paypal-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

echo "--- PayPal (leave blank to keep the processor off) ---"
read -r -p "Enter PAYPAL_CLIENT_ID: " PAYPAL_CLIENT_ID
read -r -s -p "Enter PAYPAL_CLIENT_SECRET: " PAYPAL_CLIENT_SECRET
echo ""
read -r -p "Enter PAYPAL_WEBHOOK_ID: " PAYPAL_WEBHOOK_ID

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_YAML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/billing-paypal-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_YAML_DIR}/podverse-billing-paypal-opaque.yaml"
trap 'rm -rf "$TMP_YAML_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=PAYPAL_CLIENT_ID="${PAYPAL_CLIENT_ID}" \
	--from-literal=PAYPAL_CLIENT_SECRET="${PAYPAL_CLIENT_SECRET}" \
	--from-literal=PAYPAL_WEBHOOK_ID="${PAYPAL_WEBHOOK_ID}" \
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
