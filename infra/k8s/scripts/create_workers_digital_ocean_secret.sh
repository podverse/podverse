#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Workers DigitalOcean secret.

set -euo pipefail

echo "Running create_workers_digital_ocean_secret.sh"

# ENVIRONMENT INPUT
read -r -p "Enter environment [alpha]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-workers-digital-ocean-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./k8s/secrets/podverse-${ENVIRONMENT}-workers-digital-ocean-opaque.enc.yaml"

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
echo "--- DIGITALOCEAN SPACES ---"
read -r -s -p "Enter DIGITAL_OCEAN_ACCESS_KEY: " DIGITAL_OCEAN_ACCESS_KEY
echo ""
if [ -z "$DIGITAL_OCEAN_ACCESS_KEY" ]; then echo "Error: DIGITAL_OCEAN_ACCESS_KEY required."; exit 1; fi

read -r -s -p "Enter DIGITAL_OCEAN_SECRET_KEY: " DIGITAL_OCEAN_SECRET_KEY
echo ""
if [ -z "$DIGITAL_OCEAN_SECRET_KEY" ]; then echo "Error: DIGITAL_OCEAN_SECRET_KEY required."; exit 1; fi

# --- GENERATION ---
mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE="$(mktemp -t "${SECRET_NAME}.XXXXXX.yaml")"
kubectl create secret generic "${SECRET_NAME}" \
    --namespace "${NAMESPACE}" \
    --from-literal=DIGITAL_OCEAN_ACCESS_KEY="${DIGITAL_OCEAN_ACCESS_KEY}" \
    --from-literal=DIGITAL_OCEAN_SECRET_KEY="${DIGITAL_OCEAN_SECRET_KEY}" \
    --dry-run=client -o yaml > "$TMP_FILE"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
    --input-type=yaml "$TMP_FILE" > "${OUTPUT_FILE}"

rm -f "$TMP_FILE"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "You can verify the values (if you have the key) by running:"
echo "sops -d ${OUTPUT_FILE}"
echo ""
echo "You can apply the values (if you have the key) by running:"
echo "sops -d ${OUTPUT_FILE} | kubectl apply -f -"
