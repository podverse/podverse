#!/usr/bin/env bash
# VERSION: 1
# Helper to create the encrypted Cloudflare Tunnel token Secret (cloudflared).

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
echo "Running create_cloudflared_tunnel_secret.sh - Version: ${VERSION}"

SECRET_NAME="cloudflared-tunnel-secret"
NAMESPACE="external-infra"
OUTPUT_FILE="./secrets/cloudflared-tunnel-secret.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

echo "Enter your Cloudflare Tunnel token (Zero Trust → Tunnels → token):"
read -rs TUNNEL_TOKEN
echo ""

if [ -z "$TUNNEL_TOKEN" ]; then
	echo "Error: Tunnel token is required."
	exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"

TMP_DIR="$(mktemp -d "${TMPDIR:-/tmp}/cloudflared-tunnel-secret-XXXXXX")"
TMP_FILE="${TMP_DIR}/cloudflared-tunnel-secret.yaml"
trap 'rm -rf "$TMP_DIR"' EXIT

echo "Generating secret manifest..."

kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=tunnel-token="${TUNNEL_TOKEN}" \
	--dry-run=client -o yaml >"$TMP_FILE"

echo "Encrypting with SOPS to ${OUTPUT_FILE}..."

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "$TMP_FILE" >"${OUTPUT_FILE}"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "----------------------------------------------------"
echo "Verify:"
echo "  sops -d ${OUTPUT_FILE}"
echo "Apply:"
echo "  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
