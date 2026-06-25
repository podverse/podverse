#!/usr/bin/env bash
# Verify RTM tags exist in GHCR after Publish (main).
# Usage: verifyProductionTags.sh [X.Y.Z] [--staging-n N]
#   X.Y.Z defaults to base version from root package.json.
#   --staging-n N: also verify digest matches X.Y.Z-staging.N (requires crane).

set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=lib/podverse-images.sh
source "$SCRIPT_DIR/lib/podverse-images.sh"
# shellcheck source=../lib/github-repo.sh
source "$SCRIPT_DIR/../lib/github-repo.sh"

cd "$REPO_ROOT"

BASE=""
STAGING_N=""

while [[ $# -gt 0 ]]; do
  case "$1" in
    --staging-n)
      STAGING_N="${2:-}"
      shift 2
      ;;
    -*)
      echo "Unknown option: $1" >&2
      exit 1
      ;;
    *)
      if [[ -z "$BASE" ]]; then
        BASE="$1"
      else
        echo "Unexpected argument: $1" >&2
        exit 1
      fi
      shift
      ;;
  esac
done

if [[ -z "$BASE" ]]; then
  BASE=$(node -p "require('./package.json').version" | sed 's/-.*//')
fi

if ! command -v jq > /dev/null 2>&1; then
  echo "ERROR: jq is required." >&2
  exit 1
fi

TOKEN=$(podverse_ghcr_bearer_token || true)
if [[ -z "$TOKEN" ]]; then
  echo "ERROR: Set GHCR_REGISTRY_TOKEN or run gh auth login." >&2
  exit 1
fi

if command -v gh > /dev/null 2>&1; then
  REPO=$(podverse_github_repo_from_origin) || REPO="${GHCR_REPO:-podverse/podverse}"
else
  REPO="${GHCR_REPO:-podverse/podverse}"
  echo "Note: gh not found; using GHCR_REPO=${REPO}" >&2
fi

echo "Verifying production tags for base ${BASE} in ${REPO}..."

FAIL=0
for app in "${PODVERSE_GHCR_APPS[@]}"; do
  for tag in "$BASE" latest; do
    if ! podverse_ghcr_has_tag "$REPO" "$app" "$tag"; then
      echo "MISSING: ghcr.io/${REPO}/${app}:${tag}"
      FAIL=1
    else
      echo "OK: ghcr.io/${REPO}/${app}:${tag}"
    fi
  done
done

if [[ "$FAIL" -ne 0 ]]; then
  echo "Production tag verification failed." >&2
  exit 1
fi

if [[ -n "$STAGING_N" ]]; then
  if ! command -v crane > /dev/null 2>&1; then
    echo "WARNING: crane not installed; skipping digest comparison." >&2
    exit 0
  fi
  STAGING_TAG="${BASE}-staging.${STAGING_N}"
  echo ""
  echo "Comparing digests: ${STAGING_TAG} vs ${BASE}..."
  for app in "${PODVERSE_GHCR_APPS[@]}"; do
    IMAGE="ghcr.io/${REPO}/${app}"
    STAGING_DIGEST=$(crane digest "${IMAGE}:${STAGING_TAG}" 2> /dev/null || true)
    PROD_DIGEST=$(crane digest "${IMAGE}:${BASE}" 2> /dev/null || true)
    if [[ -z "$STAGING_DIGEST" || -z "$PROD_DIGEST" ]]; then
      echo "WARN: Could not read digest for ${app}"
      continue
    fi
    if [[ "$STAGING_DIGEST" != "$PROD_DIGEST" ]]; then
      echo "MISMATCH: ${app} staging=${STAGING_DIGEST} prod=${PROD_DIGEST}"
      FAIL=1
    else
      echo "OK digest: ${app}"
    fi
  done
fi

if [[ "$FAIL" -ne 0 ]]; then
  exit 1
fi

echo "Production tag verification passed."
