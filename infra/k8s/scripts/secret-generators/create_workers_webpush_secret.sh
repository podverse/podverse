#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Workers WebPush VAPID private key secret.
# Generate a key pair with: npx web-push generate-vapid-keys
# (public key + non-secret settings belong in ConfigMaps / NEXT_PUBLIC_* for web.)

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

echo "Running create_workers_webpush_secret.sh"

read -r -p "Enter environment [alpha]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-workers-webpush-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-workers-webpush-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

echo ""
echo "Enter WEBPUSH_VAPID_PRIVATE_KEY (from npx web-push generate-vapid-keys),"
echo "or press Enter for an empty placeholder (edit via sops before apply if WebPush is enabled)."
read -r -s -p "Private key: " WEBPUSH_VAPID_PRIVATE_KEY
echo ""

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE="$(mktemp -t "${SECRET_NAME}.XXXXXX.yaml")"
kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=WEBPUSH_VAPID_PRIVATE_KEY="${WEBPUSH_VAPID_PRIVATE_KEY}" \
	--dry-run=client -o yaml >"$TMP_FILE"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "$TMP_FILE" >"${OUTPUT_FILE}"

rm -f "$TMP_FILE"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
