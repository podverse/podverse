#!/usr/bin/env bash
# VERSION: 3
# SOPS-encrypted `podverse-workers-webpush-opaque` contains only `WEBPUSH_VAPID_PRIVATE_KEY`.
# The paired public key is written to workers + web source env when paths exist. Configure
# WEBPUSH_VAPID_SUBJECT in workers and API source env (see apps/workers/ENV.md, apps/api/ENV.md).

set -euo pipefail

WEBPUSH_NPX_PKG="web-push@3.6.6"
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

WORKERS_ENV_FILE=""
WEB_ENV_FILE=""

# When run from repo root (CWD), detect GitOps layout (apps/podverse-*) or monorepo (infra/k8s/base).
set_public_env_paths() {
	local env="${1:-alpha}"
	WORKERS_ENV_FILE=""
	WEB_ENV_FILE=""
	if [[ -f "apps/podverse-${env}/workers/source/workers.env" && -f "apps/podverse-${env}/web/source/web-sidecar.env" ]]; then
		WORKERS_ENV_FILE="apps/podverse-${env}/workers/source/workers.env"
		WEB_ENV_FILE="apps/podverse-${env}/web/source/web-sidecar.env"
		return 0
	fi
	if [[ -f "infra/k8s/base/workers/source/workers.env" && -f "infra/k8s/base/web/source/web-sidecar.env" ]]; then
		WORKERS_ENV_FILE="infra/k8s/base/workers/source/workers.env"
		WEB_ENV_FILE="infra/k8s/base/web/source/web-sidecar.env"
		return 0
	fi
	return 1
}

update_env_key() {
	if ! command -v python3 >/dev/null 2>&1; then
		echo "python3 is required to update public VAPID lines in place. Install it or set the public keys manually." >&2
		return 1
	fi
	local file="$1"
	local name="$2"
	local value="$3"
	# shellcheck disable=SC2016
	python3 -c '
import re, sys
path, k, v = sys.argv[1:4]
text = open(path, encoding="utf-8").read()
ptn = re.compile(r"^" + re.escape(k) + r"=.*$", re.M)
if not ptn.search(text):
    sys.exit(f"error: {k!r} not found in {path!r}")
out = ptn.sub(k + "=" + v, text, count=1)
open(path, "w", encoding="utf-8").write(out)
' "$file" "$name" "$value"
}

# Set to 1 when WEBPUSH_VAPID_PUBLIC_KEY and NEXT_PUBLIC_* are written into repo env files.
VAPID_PUBLIC_KEYS_WRITTEN_TO_ENV=0

generate_vapid_pair() {
	if ! command -v npx >/dev/null 2>&1; then
		echo "npx is not on PATH. Install Node.js (e.g. nix develop) so the web-push package can be run." >&2
		return 1
	fi
	if ! command -v node >/dev/null 2>&1; then
		echo "node is not on PATH. Install Node.js to parse VAPID key output." >&2
		return 1
	fi
	local vapid_json
	# `npx -- node -e require('web-push')` is fragile across npx versions; the package CLI is reliable.
	if ! vapid_json="$(npx -y --package="${WEBPUSH_NPX_PKG}" web-push generate-vapid-keys --json)"; then
		return 1
	fi
	WEBPUSH_VAPID_PUBLIC_KEY="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.publicKey)" "${vapid_json}")"
	WEBPUSH_VAPID_PRIVATE_KEY="$(node -e "const j=JSON.parse(process.argv[1]); process.stdout.write(j.privateKey)" "${vapid_json}")"
	export WEBPUSH_VAPID_PUBLIC_KEY WEBPUSH_VAPID_PRIVATE_KEY
}

update_public_env_files() {
	local pub="${1:-}"
	if [[ -z "$pub" ]]; then
		return 0
	fi
	if ! set_public_env_paths "${ENVIRONMENT}"; then
		echo "No workers/web public env at expected paths. The same public key (pair of the new private key in the Secret) is printed at the end for copy-paste, or re-run from the monorepo or GitOps repository root (see repo README)."
		return 0
	fi
	echo "Updating paired public VAPID keys in:"
	echo "  ${WORKERS_ENV_FILE} (WEBPUSH_VAPID_PUBLIC_KEY)"
	echo "  ${WEB_ENV_FILE} (NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY)"
	update_env_key "${WORKERS_ENV_FILE}" "WEBPUSH_VAPID_PUBLIC_KEY" "${pub}" || return 1
	update_env_key "${WEB_ENV_FILE}" "NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY" "${pub}" || return 1
	VAPID_PUBLIC_KEYS_WRITTEN_TO_ENV=1
}

echo "Running create_workers_webpush_secret.sh"

if [[ "$AUTO_GEN" = true ]]; then
	ENVIRONMENT="${1:-alpha}"
	echo "Auto-generating with environment: ${ENVIRONMENT}"
	echo "Generating VAPID key pair (npx, package ${WEBPUSH_NPX_PKG})..."
	generate_vapid_pair
else
	read -r -p "Enter environment [alpha]: " ENVIRONMENT
	ENVIRONMENT="${ENVIRONMENT:-alpha}"
	if set_public_env_paths "${ENVIRONMENT}"; then
		echo ""
		echo "Public env sources found. Generate a new key pair and update public key lines, or"
		echo "enter an existing private key / empty placeholder."
		echo ""
		read -r -p "Generate new VAPID key pair and update public key lines? (Y/n) " G
		if [[ -z "$G" || "$G" =~ ^[yY] ]]; then
			echo "Generating VAPID key pair (npx, package ${WEBPUSH_NPX_PKG})..."
			generate_vapid_pair
		else
			echo ""
			WEBPUSH_VAPID_PUBLIC_KEY=""
			echo "Enter WEBPUSH_VAPID_PRIVATE_KEY, or press Enter for an empty SOPS placeholder."
			read -r -s -p "Private key: " WEBPUSH_VAPID_PRIVATE_KEY
			echo ""
		fi
	else
		echo ""
		echo "No workers/web public env at expected paths. Enter WEBPUSH_VAPID_PRIVATE_KEY"
		echo "(e.g. from: npx web-push generate-vapid-keys) or press Enter for a placeholder."
		WEBPUSH_VAPID_PUBLIC_KEY=""
		read -r -s -p "Private key: " WEBPUSH_VAPID_PRIVATE_KEY
		echo ""
	fi
	WEBPUSH_VAPID_PRIVATE_KEY="${WEBPUSH_VAPID_PRIVATE_KEY:-}"
	if [[ -z "${WEBPUSH_VAPID_PUBLIC_KEY:-}" ]]; then
		WEBPUSH_VAPID_PUBLIC_KEY=""
	fi
fi
set -u
WEBPUSH_VAPID_PRIVATE_KEY="${WEBPUSH_VAPID_PRIVATE_KEY:-}"

SECRET_NAME="podverse-workers-webpush-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-workers-webpush-opaque.enc.yaml"

if [ -n "$OUTPUT_FILE_OVERRIDE" ]; then
	OUTPUT_FILE="$OUTPUT_FILE_OVERRIDE"
fi

# Update public env in repo (same keypair as the secret) when we generated a pair
if [[ -n "${WEBPUSH_VAPID_PUBLIC_KEY:-}" ]]; then
	update_public_env_files "${WEBPUSH_VAPID_PUBLIC_KEY}" || exit 1
fi

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

if [[ -z "$WEBPUSH_VAPID_PRIVATE_KEY" && "$AUTO_GEN" = true ]]; then
	echo "error: VAPID private key missing after --auto-gen" >&2
	exit 1
fi

TMP_FILE_BASE="$(mktemp -t "${SECRET_NAME}.XXXXXX")"
TMP_FILE="${TMP_FILE_BASE}.yaml"
mv "$TMP_FILE_BASE" "$TMP_FILE"
kubectl create secret generic "${SECRET_NAME}" \
	--namespace "${NAMESPACE}" \
	--from-literal=WEBPUSH_VAPID_PRIVATE_KEY="${WEBPUSH_VAPID_PRIVATE_KEY}" \
	--dry-run=client -o yaml >"$TMP_FILE"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
	--input-type=yaml "$TMP_FILE" >"${OUTPUT_FILE}"

rm -f "$TMP_FILE"

echo "----------------------------------------------------"
echo "SUCCESS: Encrypted secret created at ${OUTPUT_FILE}"
echo "(Only WEBPUSH_VAPID_PRIVATE_KEY is stored in this SOPS file.)"
echo "----------------------------------------------------"
if [[ -n "${WEBPUSH_VAPID_PUBLIC_KEY:-}" && "$VAPID_PUBLIC_KEYS_WRITTEN_TO_ENV" = "1" ]]; then
	echo "Paired public VAPID keys were written to workers + web source env (same keypair as the private key above)."
elif [[ -n "${WEBPUSH_VAPID_PUBLIC_KEY:-}" ]]; then
	echo ""
	echo "Add these lines to your workers and web source env (public only, paired with the private key in the Secret):"
	echo "  WEBPUSH_VAPID_PUBLIC_KEY=${WEBPUSH_VAPID_PUBLIC_KEY}"
	echo "  NEXT_PUBLIC_WEBPUSH_VAPID_PUBLIC_KEY=${WEBPUSH_VAPID_PUBLIC_KEY}"
	echo "Set WEBPUSH_VAPID_SUBJECT in workers and API .env or source env (see apps/workers/ENV.md and apps/api/ENV.md)."
	echo "  GitOps example: apps/podverse-<env>/{workers,api}/source/*.env"
fi
echo "Verify: sops -d ${OUTPUT_FILE}"
echo "Apply:  sops -d ${OUTPUT_FILE} | kubectl apply -f -"
