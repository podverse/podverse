#!/usr/bin/env bash
# VERSION: 2
# Encrypted Secret for Alertmanager ntfy webhook URLs and optional credentials.
# Keys:
# - podverse-alpha-url (required)
# - metaboost-alpha-url (required)
# - token (optional)
# - watchdog-url (optional)

set -euo pipefail

OUTPUT_FILE_OVERRIDE=""
NAMESPACE_OVERRIDE=""

usage() {
  echo "Usage: $0 [--namespace <name>] [--output-file <path>]" >&2
  echo "  --namespace    Kubernetes namespace (default: monitoring)" >&2
  echo "  --output-file  Override default ./secrets/ntfy-alerts.enc.yaml" >&2
}

while [[ $# -gt 0 ]]; do
  case "${1}" in
    --namespace)
      NAMESPACE_OVERRIDE="${2:?--namespace requires a value}"
      shift 2
      ;;
    --output-file)
      OUTPUT_FILE_OVERRIDE="${2:?--output-file requires a value}"
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

echo "Running create_ntfy_alerts_secret.sh - Version: 2"

SECRET_NAME="ntfy-alerts"
NAMESPACE="monitoring"
OUTPUT_FILE="./secrets/ntfy-alerts.enc.yaml"
# Inline templates map Alertmanager payloads to message title/text and priority.
DEFAULT_NTFY_QUERY='template=yes&title={{if+eq+.status+"resolved"}}Resolved:+{{(first+.alerts).labels.alertname}}{{else}}Firing:+{{(first+.alerts).labels.alertname}}{{end}}&message={{if+eq+.status+"resolved"}}{{(first+.alerts).labels.alertname}}+resolved{{else}}{{(first+.alerts).labels.alertname}}+firing+(severity={{(first+.alerts).labels.severity}}){{end}}&priority={{if+eq+.status+"resolved"}}2{{else+if+eq+(first+.alerts).labels.severity+"critical"}}5{{else+if+eq+(first+.alerts).labels.severity+"warning"}}3{{else}}3{{end}}'
DEFAULT_PODVERSE_ALPHA_URL="https://ntfy.sh/REPLACE_WITH_PODVERSE_ALPHA_RANDOM_TOPIC?${DEFAULT_NTFY_QUERY}"
DEFAULT_METABOOST_ALPHA_URL="https://ntfy.sh/REPLACE_WITH_METABOOST_ALPHA_RANDOM_TOPIC?${DEFAULT_NTFY_QUERY}"

if [[ -n "${NAMESPACE_OVERRIDE}" ]]; then
  NAMESPACE="${NAMESPACE_OVERRIDE}"
fi

if [[ -n "${OUTPUT_FILE_OVERRIDE}" ]]; then
  OUTPUT_FILE="${OUTPUT_FILE_OVERRIDE}"
fi

read -r -s -p "podverse-alpha topic URL (podverse-alpha-url) [${DEFAULT_PODVERSE_ALPHA_URL}]: " PODVERSE_ALPHA_URL_INPUT
echo ""
PODVERSE_ALPHA_URL="${PODVERSE_ALPHA_URL_INPUT:-${DEFAULT_PODVERSE_ALPHA_URL}}"

read -r -s -p "metaboost-alpha topic URL (metaboost-alpha-url) [${DEFAULT_METABOOST_ALPHA_URL}]: " METABOOST_ALPHA_URL_INPUT
echo ""
METABOOST_ALPHA_URL="${METABOOST_ALPHA_URL_INPUT:-${DEFAULT_METABOOST_ALPHA_URL}}"

read -r -s -p "ntfy bearer token (optional, key token): " NTFY_TOKEN
echo ""

read -r -s -p "Watchdog dead-man URL (optional, key watchdog-url): " WATCHDOG_URL
echo ""

declare -a SECRET_ARGS
SECRET_ARGS+=("--from-literal=podverse-alpha-url=${PODVERSE_ALPHA_URL}")
SECRET_ARGS+=("--from-literal=metaboost-alpha-url=${METABOOST_ALPHA_URL}")

if [[ -n "${NTFY_TOKEN}" ]]; then
  SECRET_ARGS+=("--from-literal=token=${NTFY_TOKEN}")
fi

if [[ -n "${WATCHDOG_URL}" ]]; then
  SECRET_ARGS+=("--from-literal=watchdog-url=${WATCHDOG_URL}")
fi

mkdir -p "$(dirname "${OUTPUT_FILE}")"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/ntfy-alerts-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_DIR}/ntfy-alerts.yaml"
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
echo "  Keys: podverse-alpha-url, metaboost-alpha-url, optional token, optional watchdog-url"
echo "----------------------------------------------------"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  kubectl create namespace ${NAMESPACE} --dry-run=client -o yaml | kubectl apply -f -"
echo "        sops -d ${OUTPUT_FILE} | kubectl apply -f -"
