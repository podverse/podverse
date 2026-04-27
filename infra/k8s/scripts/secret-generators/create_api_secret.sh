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

# Generate secure random password (hex-only, 32 chars = 128 bits; consistent with other create_* scripts)
generate_password() {
	openssl rand -hex 32 | tr -d '\n'
}

echo "Running create_api_secret.sh"

# ENVIRONMENT INPUT
if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-api-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-api-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
if [ "$AUTO_GEN" = true ]; then
	echo "Auto-generating secrets..."
	AUTH_JWT_SECRET=$(uuidgen | tr '[:upper:]' '[:lower:]' | tr -d '\n')
	MAILER_USERNAME=""
	MAILER_PASSWORD=""
	METABOOST_SIGNING_KEY_PEM=""
	METABOOST_APP_ASSERTION_ISS=""
	echo "  AUTH_JWT_SECRET: [generated]"
	echo "  MAILER_USERNAME: [empty - supply via sops edit]"
	echo "  MAILER_PASSWORD: [empty - supply via sops edit]"
	echo "  METABOOST_SIGNING_KEY_PEM: [empty - supply via sops edit]"
	echo "  METABOOST_APP_ASSERTION_ISS: [empty - supply via sops edit]"
else
	echo "--- AUTHENTICATION ---"
	read -r -s -p "Enter AUTH_JWT_SECRET (Random String): " AUTH_JWT_SECRET
	echo ""
	if [ -z "$AUTH_JWT_SECRET" ]; then
		echo "Error: JWT Secret required."
		exit 1
	fi

	echo ""
	echo "--- MAILER (Optional - Press Enter to skip) ---"
	read -r -p "Enter MAILER_USERNAME: " MAILER_USERNAME
	read -r -s -p "Enter MAILER_PASSWORD: " MAILER_PASSWORD
	echo ""

	echo ""
	echo "--- METABOOST APP ASSERTION (Optional - Press Enter to leave empty) ---"
	read -r -p "Enter METABOOST_APP_ASSERTION_ISS: " METABOOST_APP_ASSERTION_ISS
	read -r -s -p "Enter METABOOST_SIGNING_KEY_PEM (PEM, paste then Enter): " METABOOST_SIGNING_KEY_PEM
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
	--from-literal=MAILER_USERNAME="${MAILER_USERNAME}" \
	--from-literal=MAILER_PASSWORD="${MAILER_PASSWORD}" \
	--from-literal=METABOOST_SIGNING_KEY_PEM="${METABOOST_SIGNING_KEY_PEM}" \
	--from-literal=METABOOST_APP_ASSERTION_ISS="${METABOOST_APP_ASSERTION_ISS}" \
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
