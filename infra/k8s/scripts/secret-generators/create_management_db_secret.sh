#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Management DB secret.
# Emits only DB_MANAGEMENT_* keys; runtime POSTGRES_* mapping happens in manifests/compose.

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
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-management-db-opaque.enc.yaml"

# Allow orchestrator to override output path
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
  OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# ------------------------------------------------------------------
# INPUTS
# ------------------------------------------------------------------
DEFAULT_MANAGEMENT_DB="podverse_management"
DEFAULT_MANAGEMENT_OWNER_USER="podverse_management_owner"
DEFAULT_MIGRATOR_USER="podverse_management_migrator"
DEFAULT_READ_WRITE_USER="podverse_management_read_write"
DEFAULT_READ_USER="podverse_management_read"

if [ "$AUTO_GEN" = true ]; then
  echo "Auto-generating secrets..."
  DB_MANAGEMENT_NAME="$DEFAULT_MANAGEMENT_DB"
  DB_MANAGEMENT_OWNER_USER="$DEFAULT_MANAGEMENT_OWNER_USER"
  DB_MANAGEMENT_MIGRATOR_USER="$DEFAULT_MIGRATOR_USER"
  DB_MANAGEMENT_READ_WRITE_USER="$DEFAULT_READ_WRITE_USER"
  DB_MANAGEMENT_READ_USER="$DEFAULT_READ_USER"
  DB_MANAGEMENT_OWNER_PASSWORD=$(generate_password)
  DB_MANAGEMENT_MIGRATOR_PASSWORD=$(generate_password)
  DB_MANAGEMENT_READ_WRITE_PASSWORD=$(generate_password)
  DB_MANAGEMENT_READ_PASSWORD=$(generate_password)
  echo "  DB_MANAGEMENT_NAME: $DB_MANAGEMENT_NAME"
  echo "  DB_MANAGEMENT_OWNER_USER: $DB_MANAGEMENT_OWNER_USER"
  echo "  DB_MANAGEMENT_MIGRATOR_USER: $DB_MANAGEMENT_MIGRATOR_USER"
  echo "  DB_MANAGEMENT_OWNER_PASSWORD: [generated]"
  echo "  DB_MANAGEMENT_MIGRATOR_PASSWORD: [generated]"
  echo "  DB_MANAGEMENT_READ_WRITE_PASSWORD: [generated]"
  echo "  DB_MANAGEMENT_READ_PASSWORD: [generated]"
else
  echo "You are generating the Management DB credentials."
  echo "Press Enter to use the default value."
  echo ""

  echo ""
  echo "--- DBNAME INPUTS ---"
  read -r -p "DB_MANAGEMENT_NAME [${DEFAULT_MANAGEMENT_DB}]: " INPUT_DB
  DB_MANAGEMENT_NAME="${INPUT_DB:-$DEFAULT_MANAGEMENT_DB}"
  echo ""
  echo "--- USERNAME INPUTS ---"
  echo "--- ADMIN USER ---"
  read -r -p "DB_MANAGEMENT_OWNER_USER [${DEFAULT_MANAGEMENT_OWNER_USER}]: " INPUT_USER
  DB_MANAGEMENT_OWNER_USER="${INPUT_USER:-$DEFAULT_MANAGEMENT_OWNER_USER}"
  echo ""
  echo "--- MIGRATOR USER ---"
  read -r -p "DB_MANAGEMENT_MIGRATOR_USER [${DEFAULT_MIGRATOR_USER}]: " INPUT_MIGRATOR_USER
  DB_MANAGEMENT_MIGRATOR_USER="${INPUT_MIGRATOR_USER:-$DEFAULT_MIGRATOR_USER}"
  echo ""
  echo "--- READ-WRITE USER ---"
  read -r -p "DB_MANAGEMENT_READ_WRITE_USER [${DEFAULT_READ_WRITE_USER}]: " INPUT_READ_WRITE_USER
  DB_MANAGEMENT_READ_WRITE_USER="${INPUT_READ_WRITE_USER:-$DEFAULT_READ_WRITE_USER}"
  echo ""
  echo "--- READ-ONLY USER ---"
  read -r -p "DB_MANAGEMENT_READ_USER [${DEFAULT_READ_USER}]: " INPUT_READ_USER
  DB_MANAGEMENT_READ_USER="${INPUT_READ_USER:-$DEFAULT_READ_USER}"

  echo ""
  echo "--- SENSITIVE INPUTS ---"
  read -r -s -p "Enter DB_MANAGEMENT_OWNER_PASSWORD (Owner): " DB_MANAGEMENT_OWNER_PASSWORD
  echo ""
  if [ -z "$DB_MANAGEMENT_OWNER_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi

  read -r -s -p "Enter DB_MANAGEMENT_MIGRATOR_PASSWORD (Migrator User): " DB_MANAGEMENT_MIGRATOR_PASSWORD
  echo ""
  if [ -z "$DB_MANAGEMENT_MIGRATOR_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi

  read -r -s -p "Enter DB_MANAGEMENT_READ_WRITE_PASSWORD (Read-Write User): " DB_MANAGEMENT_READ_WRITE_PASSWORD
  echo ""
  if [ -z "$DB_MANAGEMENT_READ_WRITE_PASSWORD" ]; then
    echo "Error: Password required."
    exit 1
  fi

  read -r -s -p "Enter DB_MANAGEMENT_READ_PASSWORD (Read-only User): " DB_MANAGEMENT_READ_PASSWORD
  echo ""
  if [ -z "$DB_MANAGEMENT_READ_PASSWORD" ]; then
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
  --from-literal=DB_MANAGEMENT_NAME="${DB_MANAGEMENT_NAME}" \
  --from-literal=DB_MANAGEMENT_OWNER_USER="${DB_MANAGEMENT_OWNER_USER}" \
  --from-literal=DB_MANAGEMENT_OWNER_PASSWORD="${DB_MANAGEMENT_OWNER_PASSWORD}" \
  --from-literal=DB_MANAGEMENT_MIGRATOR_USER="${DB_MANAGEMENT_MIGRATOR_USER}" \
  --from-literal=DB_MANAGEMENT_MIGRATOR_PASSWORD="${DB_MANAGEMENT_MIGRATOR_PASSWORD}" \
  --from-literal=DB_MANAGEMENT_READ_WRITE_USER="${DB_MANAGEMENT_READ_WRITE_USER}" \
  --from-literal=DB_MANAGEMENT_READ_WRITE_PASSWORD="${DB_MANAGEMENT_READ_WRITE_PASSWORD}" \
  --from-literal=DB_MANAGEMENT_READ_USER="${DB_MANAGEMENT_READ_USER}" \
  --from-literal=DB_MANAGEMENT_READ_PASSWORD="${DB_MANAGEMENT_READ_PASSWORD}" \
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
echo "Note: If you had an existing management-db secret, re-apply after re-running this script so it contains DB_MANAGEMENT_* keys."
