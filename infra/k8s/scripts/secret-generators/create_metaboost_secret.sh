#!/usr/bin/env bash
# VERSION: 1
# Encrypted Secret for Metaboost App Assertion signing (issuer + PEM).
# Separate from podverse-api-opaque. Set both keys together when enabling minting.

set -euo pipefail

AUTO_GEN=false
OUTPUT_FILE_OVERRIDE=""

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

echo "Running create_metaboost_secret.sh - Version: 1"

if [ "$AUTO_GEN" = true ]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: $ENVIRONMENT"
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
fi
ENVIRONMENT="${ENVIRONMENT:-alpha}"

SECRET_NAME="podverse-metaboost-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-metaboost-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

if [ "$AUTO_GEN" = true ]; then
	METABOOST_APP_ASSERTION_ISS=""
	METABOOST_SIGNING_KEY_PEM=""
	echo "  METABOOST_APP_ASSERTION_ISS: [empty—re-run without --auto-gen to set]"
	echo "  METABOOST_SIGNING_KEY_PEM: [empty—re-run without --auto-gen to set]"
else
	echo "--- Metaboost App Assertion (optional; set both or neither at runtime) ---"
	read -r -p "Enter METABOOST_APP_ASSERTION_ISS: " METABOOST_APP_ASSERTION_ISS
	read -r -p "Path to METABOOST_SIGNING_KEY_PEM file (empty if none): " PEM_PATH
	METABOOST_SIGNING_KEY_PEM=""
	if [ -n "${PEM_PATH}" ]; then
		if [ ! -f "${PEM_PATH}" ]; then
			echo "Error: file not found: ${PEM_PATH}" >&2
			exit 1
		fi
		METABOOST_SIGNING_KEY_PEM="$(cat "${PEM_PATH}")"
	fi
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_YAML_DIR="$(mktemp -d "${TMPDIR:-/tmp}/metaboost-secret-yaml.XXXXXX")"
TMP_FILE="${TMP_YAML_DIR}/podverse-metaboost-opaque.yaml"
trap 'rm -rf "$TMP_YAML_DIR"' EXIT

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=METABOOST_SIGNING_KEY_PEM="${METABOOST_SIGNING_KEY_PEM}" \
	--from-literal=METABOOST_APP_ASSERTION_ISS="${METABOOST_APP_ASSERTION_ISS}" \
	--dry-run=client -o yaml >"${TMP_FILE}"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "${TMP_FILE}" >"${OUTPUT_FILE}"

rm -rf "$TMP_YAML_DIR"
trap - EXIT

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
