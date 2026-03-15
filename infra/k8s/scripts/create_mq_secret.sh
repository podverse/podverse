#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted MQ secret.
# Includes aliases: ARTEMIS_* (for Broker) and MESSAGE_QUEUE_* (for Workers).

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

echo "Running create_mq_secret.sh"

# ENVIRONMENT INPUT
if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-mq-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./infra/k8s/secrets/podverse-${ENVIRONMENT}-mq-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
DEFAULT_USER="admin"

if [ "$AUTO_GEN" = true ]; then
	echo "Auto-generating secrets..."
	MQ_USER="$DEFAULT_USER"
	MQ_PASSWORD=$(generate_password)
	echo "  MQ_USER: $MQ_USER"
	echo "  MQ_PASSWORD: [generated]"
else
	echo ""
	echo "--- USERNAME INPUTS ---"

	read -r -p "Enter MQ Username [${DEFAULT_USER}]: " INPUT_USER
	MQ_USER="${INPUT_USER:-$DEFAULT_USER}"

	echo ""
	echo "--- SENSITIVE INPUTS ---"
	read -r -s -p "Enter MQ Password: " MQ_PASSWORD
	echo ""
	if [ -z "$MQ_PASSWORD" ]; then
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
kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=ARTEMIS_USER="${MQ_USER}" \
	--from-literal=ARTEMIS_PASSWORD="${MQ_PASSWORD}" \
	\
	--from-literal=MESSAGE_QUEUE_USERNAME="${MQ_USER}" \
	--from-literal=MESSAGE_QUEUE_PASSWORD="${MQ_PASSWORD}" \
	\
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
