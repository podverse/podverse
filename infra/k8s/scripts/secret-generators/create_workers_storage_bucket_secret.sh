#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Workers S3-compatible storage bucket secret.

set -euo pipefail

echo "Running create_workers_storage_bucket_secret.sh"

# ENVIRONMENT INPUT
read -r -p "Enter environment [alpha]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-workers-storage-bucket-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-workers-storage-bucket-opaque.enc.yaml"

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
echo "--- STORAGE BUCKET (S3-compatible) ---"
read -r -s -p "Enter BUCKET_ACCESS_KEY: " BUCKET_ACCESS_KEY
echo ""
if [ -z "$BUCKET_ACCESS_KEY" ]; then echo "Error: BUCKET_ACCESS_KEY required."; exit 1; fi

read -r -s -p "Enter BUCKET_SECRET_KEY: " BUCKET_SECRET_KEY
echo ""
if [ -z "$BUCKET_SECRET_KEY" ]; then echo "Error: BUCKET_SECRET_KEY required."; exit 1; fi

# --- GENERATION ---
mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE="$(mktemp -t "${SECRET_NAME}.XXXXXX.yaml")"
kubectl create secret generic "${SECRET_NAME}" \
    --namespace "${NAMESPACE}" \
    --from-literal=BUCKET_ACCESS_KEY="${BUCKET_ACCESS_KEY}" \
    --from-literal=BUCKET_SECRET_KEY="${BUCKET_SECRET_KEY}" \
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
