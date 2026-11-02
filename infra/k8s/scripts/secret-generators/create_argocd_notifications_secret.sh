#!/usr/bin/env bash
# VERSION: 2
# Encrypted Secret for Argo CD notifications webhook integrations.
# Keys:
# - ntfy-token (optional)
# - ntfy-<env>-url (one key per environment)

set -euo pipefail

OUTPUT_FILE_OVERRIDE=""
ENVIRONMENTS_OVERRIDE=""

usage() {
  echo "Usage: $0 [--output-file <path>] [--environments <csv>]" >&2
  echo "  --output-file   Override default ./secrets/argocd-notifications-secret.enc.yaml" >&2
  echo "  --environments  Comma-separated env names, e.g. podverse-alpha,metaboost-alpha" >&2
}

while [[ $# -gt 0 ]]; do
  case "${1}" in
    --output-file)
      OUTPUT_FILE_OVERRIDE="${2:?--output-file requires a value}"
      shift 2
      ;;
    --environments)
      ENVIRONMENTS_OVERRIDE="${2:?--environments requires a value}"
      shift 2
      ;;
    -h | --help)
      usage
      exit 0
      ;;
    *)
      echo "Unknown option: ${1}" >&2
      usage
      exit 1
      ;;
  esac
done

require_cmd() {
  if ! command -v "$1" >/dev/null 2>&1; then
    echo "Error: required command not found: $1" >&2
    exit 1
  fi
}

require_cmd kubectl
require_cmd sops

echo "Running create_argocd_notifications_secret.sh - Version: 2"

SECRET_NAME="argocd-notifications-secret"
NAMESPACE="argocd"
OUTPUT_FILE="./secrets/argocd-notifications-secret.enc.yaml"

if [[ -n "${OUTPUT_FILE_OVERRIDE}" ]]; then
  OUTPUT_FILE="${OUTPUT_FILE_OVERRIDE}"
fi

read -r -s -p "ntfy bearer token (optional, leave blank for none): " NTFY_TOKEN
echo ""

if [[ -n "${ENVIRONMENTS_OVERRIDE}" ]]; then
  ENVIRONMENTS="${ENVIRONMENTS_OVERRIDE}"
else
  read -r -p "Environments [podverse-alpha,metaboost-alpha]: " ENVIRONMENTS
fi
ENVIRONMENTS="${ENVIRONMENTS:-podverse-alpha,metaboost-alpha}"

declare -a ENV_LIST
IFS=',' read -r -a ENV_LIST <<<"${ENVIRONMENTS}"

declare -a SECRET_ARGS
if [[ -n "${NTFY_TOKEN}" ]]; then
  SECRET_ARGS+=("--from-literal=ntfy-token=${NTFY_TOKEN}")
fi

FOUND_ENV=0
for RAW_ENV in "${ENV_LIST[@]}"; do
  ENV_NAME="$(echo "${RAW_ENV}" | sed -e 's/^[[:space:]]*//' -e 's/[[:space:]]*$//')"
  if [[ -z "${ENV_NAME}" ]]; then
    continue
  fi

  FOUND_ENV=1
  PLACEHOLDER_ENV="$(echo "${ENV_NAME}" | tr '[:lower:]-' '[:upper:]_')"
  DEFAULT_URL="https://ntfy.sh/REPLACE_WITH_${PLACEHOLDER_ENV}_RANDOM_TOPIC"
  read -r -p "ntfy topic URL for ${ENV_NAME} [${DEFAULT_URL}]: " NTFY_URL
  NTFY_URL="${NTFY_URL:-${DEFAULT_URL}}"
  SECRET_ARGS+=("--from-literal=ntfy-${ENV_NAME}-url=${NTFY_URL}")
done

if [[ "${FOUND_ENV}" -ne 1 ]]; then
  echo "Error: provide at least one environment name." >&2
  exit 1
fi

mkdir -p "$(dirname "${OUTPUT_FILE}")"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/argocd-notifications-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_DIR}/argocd-notifications-secret.yaml"
trap 'rm -rf "${TMP_DIR}"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
  "${SECRET_ARGS[@]}" \
  --dry-run=client -o yaml >"${TMP_FILE}"

echo "Encrypting with SOPS to ${OUTPUT_FILE}..."
sops --encrypt --encrypted-regex '^(data|stringData)$' \
  --input-type=yaml "${TMP_FILE}" >"${OUTPUT_FILE}"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "  Secret name: ${SECRET_NAME} (namespace: ${NAMESPACE})"
echo "----------------------------------------------------"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -"
echo "        sops -d ${OUTPUT_FILE} | kubectl apply -f -"
