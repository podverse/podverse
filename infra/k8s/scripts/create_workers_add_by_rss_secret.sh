#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Workers Add-by-RSS secret.

set -euo pipefail

AUTO_GEN=false

# Check for --auto-gen flag
if [[ "${1:-}" == "--auto-gen" ]]; then
	AUTO_GEN=true
	shift || true
fi

generate_key() {
	openssl rand -hex 32
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
OUTPUT_FILE="./k8s/secrets/podverse-${ENVIRONMENT}-workers-add-by-rss-opaque.enc.yaml"

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
