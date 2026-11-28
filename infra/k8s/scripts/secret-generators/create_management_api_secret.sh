#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted API secret.

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

# Generate secure random JWT secret (UUID format; consistent with setup.sh AUTH_JWT_SECRET)
generate_password() {
	uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '\n'
}

echo "Running create_management-api_secret.sh"

# ENVIRONMENT INPUT
if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-management-api-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-management-api-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
if [ "$AUTO_GEN" = true ]; then
	echo "Auto-generating secrets..."
	AUTH_JWT_SECRET=$(generate_password)
	MANAGEMENT_AUTH_SECOND_FACTOR_KEY=$(openssl rand -hex 32 | tr -d '\n')
	echo "  AUTH_JWT_SECRET: [generated]"
	echo "  MANAGEMENT_AUTH_SECOND_FACTOR_KEY: [generated]"
else
	echo "--- AUTHENTICATION ---"
	read -r -s -p "Enter AUTH_JWT_SECRET (Random String): " AUTH_JWT_SECRET
	echo ""
	if [ -z "$AUTH_JWT_SECRET" ]; then
		echo "Error: JWT Secret required."
		exit 1
	fi
	read -r -s -p "Enter MANAGEMENT_AUTH_SECOND_FACTOR_KEY (64 hex characters): " MANAGEMENT_AUTH_SECOND_FACTOR_KEY
	echo ""
	if [ -z "$MANAGEMENT_AUTH_SECOND_FACTOR_KEY" ]; then
		echo "Error: MANAGEMENT_AUTH_SECOND_FACTOR_KEY is required."
		exit 1
	fi

	echo ""
fi

# --- GENERATION ---
mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE_BASE="$(mktemp -t "${SECRET_NAME}.XXXXXX")"
TMP_FILE="${TMP_FILE_BASE}.yaml"
mv "$TMP_FILE_BASE" "$TMP_FILE"
kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=AUTH_JWT_SECRET="${AUTH_JWT_SECRET}" \
	--from-literal=MANAGEMENT_AUTH_SECOND_FACTOR_KEY="${MANAGEMENT_AUTH_SECOND_FACTOR_KEY}" \
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
