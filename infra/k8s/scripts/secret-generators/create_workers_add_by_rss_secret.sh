#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Workers Add-by-RSS secret.

set -euo pipefail

AUTO_GEN=false
OUTPUT_FILE_OVERRIDE=""

# Parse flags
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

# Generate secure random key (hex-only, 32 chars = 128 bits; consistent with other create_* scripts)
generate_key() {
	openssl rand -hex 32 | tr -d '\n'
}

echo "Running create_workers_add_by_rss_secret.sh"

# ENVIRONMENT INPUT
if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-workers-add-by-rss-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-workers-add-by-rss-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
if [ "$AUTO_GEN" = true ]; then
	echo "Auto-generating secrets..."
	ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY=$(generate_key)
	echo "  ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY: [generated]"
else
	echo "--- ADD BY RSS ---"
	read -r -s -p "Enter ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY: " ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY
	echo ""
	if [ -z "$ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY" ]; then
		echo "Error: ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY required."
		exit 1
	fi
fi

# --- GENERATION ---
mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE="$(mktemp -t "${SECRET_NAME}.XXXXXX.yaml")"
kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY="${ADD_BY_RSS_CREDENTIALS_ENCRYPTION_KEY}" \
	--dry-run=client -o yaml >"$TMP_FILE"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "$TMP_FILE" >"${OUTPUT_FILE}"

rm -f "$TMP_FILE"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "You can verify the values (if you have the key) by running:"
echo "sops -d ${OUTPUT_FILE}"
echo ""
echo "You can apply the values (if you have the key) by running:"
echo "sops -d ${OUTPUT_FILE} | kubectl apply -f -"
