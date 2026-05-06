# workers-garage-secret

## Started

2026-05-05

## Author

Agent

## Context

Add Garage S3 workers secret generator script to monorepo and GitOps repo.

### Session 1 - 2026-05-05

#### Prompt (Developer)

#!/usr/bin/env bash

# VERSION: 1

# Helper to create the encrypted Workers Garage (S3) secret.

set -euo pipefail

echo "Running create_workers_garage_secret.sh"

# ENVIRONMENT INPUT

read -r -p "Enter environment [pv-k-ser-ink]: " ENVIRONMENT
ENVIRONMENT="${ENVIRONMENT:-pv-k-ser-ink}"

SECRET_NAME="podverse-workers-garage-opaque"
NAMESPACE="podverse-${ENVIRONMENT}"
OUTPUT_FILE="./secrets/podverse-${ENVIRONMENT}-workers-garage-opaque.enc.yaml"

# ------------------------------------------------------------------

# INPUTS

# ------------------------------------------------------------------

echo "--- GARAGE S3 CREDENTIALS ---"
read -r -s -p "Enter BUCKET_ACCESS_KEY: " BUCKET_ACCESS_KEY
echo ""
if [ -z "$BUCKET_ACCESS_KEY" ]; then
echo "Error: BUCKET_ACCESS_KEY required."
exit 1
fi

read -r -s -p "Enter BUCKET_SECRET_KEY: " BUCKET_SECRET_KEY
echo ""
if [ -z "$BUCKET_SECRET_KEY" ]; then
echo "Error: BUCKET_SECRET_KEY required."
exit 1
fi

# --- GENERATION ---

mkdir -p "$(dirname "$OUTPUT_FILE")"
echo "Generating and encrypting secret..."

TMP_FILE="$(mktemp -t "${SECRET_NAME}.XXXXXX.yaml")"
kubectl create secret generic "${SECRET_NAME}" \
  --namespace "${NAMESPACE}" \
 --from-literal=BUCKET_ACCESS_KEY="${BUCKET_ACCESS_KEY}" \
  --from-literal=BUCKET_SECRET_KEY="${BUCKET_SECRET_KEY}" \
 --dry-run=client -o yaml >"$TMP_FILE"

sops --encrypt --encrypted-regex '^(data|stringData)$' \
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

add this script to podverse and k.podcastdj.com

#### Key Decisions

- Added `create_workers_garage_secret.sh` under `infra/k8s/scripts/secret-generators/` (podverse) and `scripts/secret-generators/` (k.podcastdj.com); default environment `pv-k-ser-ink`; Secret `podverse-workers-garage-opaque`; output `secrets/podverse-<env>-workers-garage-opaque.enc.yaml`.
- Documented in `INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md` and listed in `create_all_secrets_auto_gen.sh` manual reminders (podverse and GitOps repo).
- Normalized `[ -z "${VAR}" ]` for shellcheck-friendly empty checks.

#### Files Created/Modified

- `infra/k8s/scripts/secret-generators/create_workers_garage_secret.sh`
- `infra/k8s/scripts/secret-generators/create_all_secrets_auto_gen.sh`
- `infra/k8s/scripts/secret-generators/INFRA-K8S-SCRIPTS-SECRET-GENERATORS.md`
- `k.podcastdj.com/scripts/secret-generators/create_workers_garage_secret.sh`
- `k.podcastdj.com/scripts/secret-generators/create_all_secrets_auto_gen.sh`

### Session 2 - 2026-05-05

#### Prompt (Developer)

look in those files you added. is there anything that should be changed to be more appropriate for the repo/s? [pv-k-ser-ink] seems out of alignment with other scripts

#### Key Decisions

- Changed default environment from `pv-k-ser-ink` to `alpha` in both repos’ `create_workers_garage_secret.sh` to match every other secret generator (`create_workers_storage_bucket_secret.sh`, `create_workers_digital_ocean_secret.sh`, etc.). Operators targeting another cluster/env (e.g. `pv-k-ser-ink`) enter it at the prompt.

#### Files Modified

- `infra/k8s/scripts/secret-generators/create_workers_garage_secret.sh`
- `k.podcastdj.com/scripts/secret-generators/create_workers_garage_secret.sh`
