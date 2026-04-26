#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted GitHub Container Registry (ghcr.io) docker-registry Secret.

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
echo "Running create_github_registry_secret.sh - Version: ${VERSION}"

SECRET_NAME="github-registry-secret"
REGISTRY="ghcr.io"

echo "Please enter your GitHub username:"
read -r GITHUB_USERNAME

if [ -z "$GITHUB_USERNAME" ]; then
	echo "Error: GitHub username is required."
	exit 1
fi

echo "Please enter your GitHub Personal Access Token (PAT):"
read -rs GITHUB_TOKEN

if [ -z "$GITHUB_TOKEN" ]; then
	echo "Error: GitHub PAT is required."
	exit 1
fi

echo ""
echo "Enter the namespace where this secret will be used (default: default):"
read -r NAMESPACE
NAMESPACE="${NAMESPACE:-default}"

OUTPUT_FILE="./secrets/github-registry-secret.enc.yaml"
if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

TMP_FILE="$(mktemp "${TMPDIR:-/tmp}/github-registry-secret.XXXXXX")"
trap 'rm -f "$TMP_FILE"' EXIT

echo "Generating Docker registry secret manifest..."

kubectl create secret docker-registry "${SECRET_NAME}" \
	--docker-server="${REGISTRY}" \
	--docker-username="${GITHUB_USERNAME}" \
	--docker-password="${GITHUB_TOKEN}" \
	--docker-email="unused@example.com" \
	--namespace "${NAMESPACE}" \
	--dry-run=client -o yaml >"$TMP_FILE"

echo "Encrypting with SOPS to ${OUTPUT_FILE}..."

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "$TMP_FILE" >"${OUTPUT_FILE}"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "To apply this secret to your cluster, run:"
echo "sops -d ${OUTPUT_FILE} | kubectl apply -f -"
echo ""
echo "To verify the keys by decrypting, run:"
echo "sops -d ${OUTPUT_FILE}"
echo ""
echo "To use this secret for image pulls, add it to your deployment:"
echo "  imagePullSecrets:"
echo "  - name: ${SECRET_NAME}"
