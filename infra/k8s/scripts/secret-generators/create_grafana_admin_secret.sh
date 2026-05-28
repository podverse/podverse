#!/usr/bin/env bash
# VERSION: 1
# Encrypted Secret for Grafana admin login (GF_SECURITY_ADMIN_*).
# GitOps: not synced by Argo — apply with sops -d ./secrets/grafana-admin.enc.yaml | kubectl apply -f -
# Example consumer: private GitOps repo apps/grafana/ (Deployment secretKeyRef grafana-admin).

set -euo pipefail

OUTPUT_FILE_OVERRIDE=""

while [[ $# -gt 0 ]]; do
	case "${1}" in
	--output-file)
		OUTPUT_FILE_OVERRIDE="${2:?--output-file requires a value}"
		shift 2
		;;
	*)
		echo "Unknown option: ${1}" >&2
		exit 1
		;;
	esac
done

VERSION="1"
echo "Running create_grafana_admin_secret.sh - Version: ${VERSION}"

SECRET_NAME="grafana-admin"
NAMESPACE="grafana"
OUTPUT_FILE="./secrets/grafana-admin.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

read -r -p "Grafana admin username [admin]: " ADMIN_USER
ADMIN_USER="${ADMIN_USER:-admin}"
echo "Using admin-user: ${ADMIN_USER}"

read -r -s -p "Grafana admin password: " ADMIN_PASSWORD
echo ""

if [ -z "${ADMIN_PASSWORD}" ]; then
	echo "Error: admin password is required."
	exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/grafana-admin-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_DIR}/grafana-admin.yaml"
trap 'rm -rf "$TMP_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=admin-user="${ADMIN_USER}" \
	--from-literal=admin-password="${ADMIN_PASSWORD}" \
	--dry-run=client -o yaml >"${TMP_FILE}"

echo "Encrypting with SOPS to ${OUTPUT_FILE}..."

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "${TMP_FILE}" >"${OUTPUT_FILE}"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "  Keys: admin-user, admin-password (both in stringData)"
echo "----------------------------------------------------"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  kubectl create namespace grafana --dry-run=client -o yaml | kubectl apply -f -"
echo "        sops -d ${OUTPUT_FILE} | kubectl apply -f -"
