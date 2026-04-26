#!/usr/bin/env bash
# VERSION: 1
# Filename: create_valkey_secret.sh
# Helper to create the encrypted Valkey secret.
# Maps inputs to KEYVALDB_PASSWORD (and generic PASSWORD for compatibility).

set -euo pipefail

# ------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------
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

# Generate secure random password (hex-only, 32 chars = 128 bits; consistent with other create_* scripts)
generate_password() {
	openssl rand -hex 32 | tr -d '\n'
}

echo "Running create_keyvaldb_secret.sh"

# ENVIRONMENT INPUT
if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

# Matches the secret name defined in podverse-alpha.yaml
SECRET_NAME="podverse-keyvaldb-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-keyvaldb-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
if [ "$AUTO_GEN" = true ]; then
	echo "Auto-generating secrets..."
	KEYVALDB_PASSWORD=$(generate_password)
	echo "  KEYVALDB_PASSWORD: [generated]"
else
	echo ""
	echo "--- SENSITIVE INPUTS ---"
	read -r -s -p "Enter Valkey Password: " KEYVALDB_PASSWORD
	echo ""
	if [ -z "$KEYVALDB_PASSWORD" ]; then
		echo "Error: Password required."
		exit 1
	fi
fi

# --- GENERATION ---
mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE_BASE="$(mktemp -t "${SECRET_NAME}.XXXXXX")"
TMP_FILE="${TMP_FILE_BASE}.yaml"
mv "$TMP_FILE_BASE" "$TMP_FILE"

# We create both KEYVALDB_PASSWORD and PASSWORD to ensure compatibility
# with various images or custom entrypoint scripts.
kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=KEYVALDB_PASSWORD="${KEYVALDB_PASSWORD}" \
	--from-literal=PASSWORD="${KEYVALDB_PASSWORD}" \
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
