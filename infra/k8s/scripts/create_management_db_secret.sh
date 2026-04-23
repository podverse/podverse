#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Management DB secret.
# It includes both POSTGRES_MANAGEMENT_* (for DB container/init) and DB_* (for apps, same shape as create_db_secret.sh).

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

echo "Running create_management_db_secret.sh"

# ------------------------------------------------------------------
# ENVIRONMENT INPUT
# ------------------------------------------------------------------
if [ "$AUTO_GEN" = true ]; then
  ENVIRONMENT="${1:-alpha}"
  echo "Auto-generating with environment: $ENVIRONMENT"
else
  read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

# ------------------------------------------------------------------
# CONFIGURATION
# ------------------------------------------------------------------
SECRET_NAME="podverse-management-db-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./infra/k8s/secrets/podverse-${ENVIRONMENT}-management-db-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
  OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
DEFAULT_DB="podverse_management"
DEFAULT_USER="postgres_user_management"
DEFAULT_READ_USER="podverse_management_read"
DEFAULT_READ_WRITE_USER="podverse_management_read_write"

if [ "$AUTO_GEN" = true ]; then
  echo "Auto-generating secrets..."
  POSTGRES_MANAGEMENT_DB="$DEFAULT_DB"
  POSTGRES_MANAGEMENT_USER="$DEFAULT_USER"
  POSTGRES_MANAGEMENT_READ_USER="$DEFAULT_READ_USER"
  POSTGRES_MANAGEMENT_READ_WRITE_USER="$DEFAULT_READ_WRITE_USER"
  POSTGRES_MANAGEMENT_PASSWORD=$(generate_password)
  POSTGRES_MANAGEMENT_READ_PASSWORD=$(generate_password)
  POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD=$(generate_password)
  MANAGEMENT_SUPERUSER_EMAIL=""
  MANAGEMENT_SUPERUSER_PASSWORD=$(generate_password)
  echo "  POSTGRES_MANAGEMENT_DB: $POSTGRES_MANAGEMENT_DB"
  echo "  POSTGRES_MANAGEMENT_USER: $POSTGRES_MANAGEMENT_USER"
  echo "  POSTGRES_MANAGEMENT_PASSWORD: [generated]"
  echo "  POSTGRES_MANAGEMENT_READ_PASSWORD: [generated]"
  echo "  POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD: [generated]"
  echo "  MANAGEMENT_SUPERUSER_EMAIL: [empty]"
  echo "  MANAGEMENT_SUPERUSER_PASSWORD: [generated]"
else
  echo "You are generating the Management DB credentials."
  echo "Press Enter to use the default value."
  echo ""

  echo ""
  echo "--- DBNAME INPUTS ---"
  read -r -p "POSTGRES_MANAGEMENT_DB [${DEFAULT_DB}]: " INPUT_DB
  POSTGRES_MANAGEMENT_DB="${INPUT_DB:-$DEFAULT_DB}"
  echo ""
  echo "--- USERNAME INPUTS ---"
  echo "--- ADMIN USER ---"
  read -r -p "POSTGRES_MANAGEMENT_USER [${DEFAULT_USER}]: " INPUT_USER
  POSTGRES_MANAGEMENT_USER="${INPUT_USER:-$DEFAULT_USER}"
  echo ""
  echo "--- READ-ONLY USER ---"
  read -r -p "POSTGRES_MANAGEMENT_READ_USER [${DEFAULT_READ_USER}]: " INPUT_READ_USER
  POSTGRES_MANAGEMENT_READ_USER="${INPUT_READ_USER:-$DEFAULT_READ_USER}"
  echo ""
  echo "--- READ-WRITE USER ---"
  read -r -p "POSTGRES_MANAGEMENT_READ_WRITE_USER [${DEFAULT_READ_WRITE_USER}]: " INPUT_READ_WRITE_USER
  POSTGRES_MANAGEMENT_READ_WRITE_USER="${INPUT_READ_WRITE_USER:-$DEFAULT_READ_WRITE_USER}"

  echo ""
  echo "--- SUPERUSER ACCOUNT ---"
  read -r -p "MANAGEMENT_SUPERUSER_EMAIL: " MANAGEMENT_SUPERUSER_EMAIL
  if [ -z "$MANAGEMENT_SUPERUSER_EMAIL" ]; then
    echo "Error: MANAGEMENT_SUPERUSER_EMAIL required."
    exit 1
  fi

  echo ""
  echo "--- SENSITIVE INPUTS ---"
  read -r -s -p "Enter POSTGRES_MANAGEMENT_PASSWORD (Superuser): " POSTGRES_MANAGEMENT_PASSWORD
  echo ""
  if [ -z "$POSTGRES_MANAGEMENT_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi

  read -r -s -p "Enter POSTGRES_MANAGEMENT_READ_PASSWORD (Read-only User): " POSTGRES_MANAGEMENT_READ_PASSWORD
  echo ""
  if [ -z "$POSTGRES_MANAGEMENT_READ_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi

  read -r -s -p "Enter POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD (App User): " POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD
  echo ""
  if [ -z "$POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi

  read -r -s -p "Enter MANAGEMENT_SUPERUSER_PASSWORD: " MANAGEMENT_SUPERUSER_PASSWORD
  echo ""
  if [ -z "$MANAGEMENT_SUPERUSER_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi
fi

# ------------------------------------------------------------------
# GENERATION
# ------------------------------------------------------------------

mkdir -p "$(dirname "$OUTPUT_FILE")"

echo "Generating and encrypting secret..."

TMP_FILE_BASE="$(mktemp -t "${SECRET_NAME}.XXXXXX")"
TMP_FILE="${TMP_FILE_BASE}.yaml"
mv "$TMP_FILE_BASE" "$TMP_FILE"

kubectl create secret generic "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  --from-literal=POSTGRES_MANAGEMENT_DB="${POSTGRES_MANAGEMENT_DB}" \
  --from-literal=POSTGRES_MANAGEMENT_USER="${POSTGRES_MANAGEMENT_USER}" \
  --from-literal=POSTGRES_MANAGEMENT_PASSWORD="${POSTGRES_MANAGEMENT_PASSWORD}" \
  --from-literal=POSTGRES_MANAGEMENT_READ_USER="${POSTGRES_MANAGEMENT_READ_USER}" \
  --from-literal=POSTGRES_MANAGEMENT_READ_PASSWORD="${POSTGRES_MANAGEMENT_READ_PASSWORD}" \
  --from-literal=POSTGRES_MANAGEMENT_READ_WRITE_USER="${POSTGRES_MANAGEMENT_READ_WRITE_USER}" \
  --from-literal=POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD="${POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD}" \
  --from-literal=DB_MANAGEMENT_NAME="${POSTGRES_MANAGEMENT_DB}" \
  --from-literal=DB_MANAGEMENT_READ_USER="${POSTGRES_MANAGEMENT_READ_USER}" \
  --from-literal=DB_MANAGEMENT_READ_PASSWORD="${POSTGRES_MANAGEMENT_READ_PASSWORD}" \
  --from-literal=DB_MANAGEMENT_READ_WRITE_USER="${POSTGRES_MANAGEMENT_READ_WRITE_USER}" \
  --from-literal=DB_MANAGEMENT_READ_WRITE_PASSWORD="${POSTGRES_MANAGEMENT_READ_WRITE_PASSWORD}" \
  --from-literal=MANAGEMENT_SUPERUSER_EMAIL="${MANAGEMENT_SUPERUSER_EMAIL}" \
  --from-literal=MANAGEMENT_SUPERUSER_PASSWORD="${MANAGEMENT_SUPERUSER_PASSWORD}" \
  --dry-run=client -o yaml >"$TMP_FILE"

sops --config .sops.yaml --encrypt --encrypted-regex '^(data|stringData)$' \
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
echo ""
echo "Note: If you had an existing management-db secret, re-apply after re-running this script so it contains DB_MANAGEMENT_* and superuser keys."
