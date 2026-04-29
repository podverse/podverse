#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Cloudflare API token secret with the correct keys.

set -euo pipefail

OUTPUT_FILE_OVERRIDE=""

while [[ $# -gt 0 ]]; do
	case "${1}" in
	--output-file)
		OUTPUT_FILE_OVERRIDE="${2:?--output-file requires a value}"
		shift 2
		;;
	*)
		echo "Unknown option: ${1}" >&2
		exit 1
		;;
	esac
done

VERSION="1"
echo "Running create_cloudflare_api_token_secret.sh - Version: ${VERSION}"

SECRET_NAME="cloudflare-api-token-secret"
NAMESPACE="cert-manager"
OUTPUT_FILE="./secrets/cloudflare-api-token-secret.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

echo "Please enter your Cloudflare API Token:"
read -r CF_API_TOKEN

if [ -z "$CF_API_TOKEN" ]; then
	echo "Error: API Token is required."
	exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cloudflare-api-token-secret-XXXXXX")"
TMP_FILE="${TMP_DIR}/cloudflare-api-token-secret.yaml"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Generating secret manifest..."

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=api-token="${CF_API_TOKEN}" \
	--dry-run=client -o yaml >"$TMP_FILE"

echo "Encrypting with SOPS to ${OUTPUT_FILE}..."

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "$TMP_FILE" >"${OUTPUT_FILE}"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "You can now verify the keys by running:"
echo "sops -d ${OUTPUT_FILE}"
