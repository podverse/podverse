#!/usr/bin/env bash
# Helper to run all auto-gen-capable create_*.sh scripts in one go.
# Scripts that require real external credentials are skipped and listed
# at the end so the operator can run them manually.

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
ENVIRONMENT="${1:-alpha}"

echo "===================================================="
echo "Running auto-gen secret scripts"
echo "Environment: ${ENVIRONMENT}"
echo "===================================================="

# -------------------------------------------------------------------
# Scripts that fully support --auto-gen
# -------------------------------------------------------------------
AUTO_GEN_SCRIPTS=(
	"create_api_secret.sh"
	"create_management_api_secret.sh"
	"create_db_secret.sh"
	"create_management_db_secret.sh"
	"create_keyvaldb_secret.sh"
	"create_mq_secret.sh"
	"create_workers_add_by_rss_secret.sh"
	"create_workers_webpush_secret.sh"
)

# -------------------------------------------------------------------
# Scripts that require real external credentials / files and do NOT
# support --auto-gen.  These are listed at the end as a reminder.
# -------------------------------------------------------------------
MANUAL_SCRIPTS=(
	"create_api.podcastindex.org_secret.sh  (requires Podcast Index API keys)"
	"create_firebase_secret.sh              (requires firebase-key.json file)"
	"create_workers_digital_ocean_secret.sh (requires DigitalOcean Spaces access/secret keys)"
)

# -------------------------------------------------------------------
# Output files produced by the auto-gen scripts (same order as above).
# Used to print verify / apply commands at the end.
# -------------------------------------------------------------------
OUTPUT_FILES=(
	"./secrets/podverse-${ENVIRONMENT}-api-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-management-api-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-db-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-management-db-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-keyvaldb-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-mq-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-workers-add-by-rss-opaque.enc.yaml"
	"./secrets/podverse-${ENVIRONMENT}-workers-webpush-opaque.enc.yaml"
)

CREATED_FILES=()

for i in "${!AUTO_GEN_SCRIPTS[@]}"; do
	script_name="${AUTO_GEN_SCRIPTS[$i]}"
	script_path="${SCRIPT_DIR}/${script_name}"
	if [ ! -f "${script_path}" ]; then
		echo "WARNING: Skipping missing script: ${script_name}"
		continue
	fi
	echo "----------------------------------------------------"
	echo "Running ${script_name}"
	bash "${script_path}" --auto-gen --output-file "${OUTPUT_FILES[$i]}" "${ENVIRONMENT}"
	CREATED_FILES+=("${OUTPUT_FILES[$i]}")
done

echo ""
echo "===================================================="
echo "Auto-gen complete."
echo "===================================================="

# -------------------------------------------------------------------
# Print copy-pasteable verify and apply commands
# -------------------------------------------------------------------
# De-duplicate output files in case any scripts share a path
UNIQUE_FILES=()
declare -A _seen
for f in "${CREATED_FILES[@]}"; do
	if [[ -z "${_seen[$f]:-}" ]]; then
		UNIQUE_FILES+=("$f")
		_seen[$f]=1
	fi
done

echo ""
echo "To verify the generated secrets (requires SOPS key):"
echo ""
for f in "${UNIQUE_FILES[@]}"; do
	echo "  sops -d ${f}"
done

echo ""
echo "To apply all generated secrets to the cluster:"
echo ""
for f in "${UNIQUE_FILES[@]}"; do
	echo "  sops -d ${f} | kubectl apply -f -"
done

echo ""
echo "Or apply them all at once:"
echo ""
printf "  "
for i in "${!UNIQUE_FILES[@]}"; do
	if [ "$i" -gt 0 ]; then
		printf " && \\\\\n  "
	fi
	printf "sops -d %s | kubectl apply -f -" "${UNIQUE_FILES[$i]}"
done
echo ""

# -------------------------------------------------------------------
# Warn about scripts that need real credentials
# -------------------------------------------------------------------
echo ""
echo "WARNING: The following scripts require real credentials"
echo "and must be run manually (they do not support --auto-gen):"
echo ""
for entry in "${MANUAL_SCRIPTS[@]}"; do
	echo "  - ${entry}"
done
echo ""
echo "Run each one individually when credentials are available."
