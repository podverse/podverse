#!/usr/bin/env bash
# Read-only preflight before RTM: verify staging is ready for sync-staging-to-main.sh.
# Does not push or modify git remotes beyond fetch.

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
# shellcheck source=../ghcr/lib/podverse-images.sh
source "$SCRIPT_DIR/../ghcr/lib/podverse-images.sh"

cd "$REPO_ROOT"

if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}Error: Uncommitted changes. Commit or stash before RTM preflight.${NC}" >&2
  exit 1
fi

if ! command -v jq > /dev/null 2>&1; then
  echo -e "${RED}Error: jq is required.${NC}" >&2
  exit 1
fi

if ! command -v gh > /dev/null 2>&1; then
  echo -e "${RED}Error: gh CLI is required for staging workflow checks.${NC}" >&2
  exit 1
fi

TOKEN=$(podverse_ghcr_bearer_token || true)
if [[ -z "$TOKEN" ]]; then
  echo -e "${RED}Error: Set GHCR_REGISTRY_TOKEN or run gh auth login.${NC}" >&2
  exit 1
fi

echo -e "${YELLOW}Fetching origin...${NC}"
git fetch origin

for ref in refs/remotes/origin/staging refs/remotes/origin/main; do
  if ! git show-ref --verify --quiet "$ref"; then
    echo -e "${RED}Error: Missing ${ref}${NC}" >&2
    exit 1
  fi
done

ORIGIN_STAGING=$(git rev-parse refs/remotes/origin/staging)
ORIGIN_MAIN=$(git rev-parse refs/remotes/origin/main)

if [[ "$ORIGIN_MAIN" == "$ORIGIN_STAGING" ]]; then
  echo -e "${YELLOW}Warning: origin/main already equals origin/staging.${NC}"
  echo -e "${YELLOW}sync-staging-to-main.sh will exit without pushing; Publish (main) will not run.${NC}"
  echo -e "${YELLOW}If images are not yet promoted, investigate before proceeding.${NC}"
fi

if ! git merge-base --is-ancestor "$ORIGIN_MAIN" "$ORIGIN_STAGING"; then
  echo -e "${RED}Error: main is not an ancestor of staging; fast-forward RTM is not possible.${NC}" >&2
  exit 1
fi

BASE=$(node -p "require('./package.json').version" | sed 's/-.*//')
echo -e "${GREEN}Base version (package.json): ${BASE}${NC}"

REPO=$(gh repo view --json nameWithOwner -q .nameWithOwner)
echo -e "${GREEN}GHCR repo: ${REPO}${NC}"

STAGING_N=$(podverse_min_staging_n "$REPO" "$BASE" "$TOKEN")
STAGING_TAG="${BASE}-staging.${STAGING_N}"
echo -e "${GREEN}Publish (main) will promote: ${STAGING_TAG} -> ${BASE} and :latest${NC}"

echo -e "${YELLOW}Checking green Publish (staging) for origin/staging (${ORIGIN_STAGING:0:7})...${NC}"
RUN_JSON=$(gh run list \
  --workflow=publish-staging.yml \
  --branch=staging \
  --limit=20 \
  --json databaseId,headSha,conclusion,status,displayTitle \
  --jq "[.[] | select(.headSha == \"${ORIGIN_STAGING}\")][0]")

if [[ -z "$RUN_JSON" || "$RUN_JSON" == "null" ]]; then
  echo -e "${RED}Error: No Publish (staging) run found for current origin/staging SHA.${NC}" >&2
  echo -e "${YELLOW}Run sync-develop-to-staging.sh and wait for a green staging publish.${NC}" >&2
  exit 1
fi

RUN_STATUS=$(echo "$RUN_JSON" | jq -r '.status')
RUN_CONCLUSION=$(echo "$RUN_JSON" | jq -r '.conclusion // empty')
RUN_ID=$(echo "$RUN_JSON" | jq -r '.databaseId')

if [[ "$RUN_STATUS" != "completed" || "$RUN_CONCLUSION" != "success" ]]; then
  echo -e "${RED}Error: Latest staging publish for this SHA is not successful (run ${RUN_ID}: ${RUN_STATUS}/${RUN_CONCLUSION}).${NC}" >&2
  exit 1
fi

echo -e "${GREEN}Publish (staging) run ${RUN_ID} succeeded for origin/staging.${NC}"

echo -e "${YELLOW}Verifying all staging tags exist in GHCR...${NC}"
for app in "${PODVERSE_GHCR_APPS[@]}"; do
  if ! podverse_ghcr_has_tag "$REPO" "$app" "$STAGING_TAG"; then
    echo -e "${RED}Error: Missing ghcr.io/${REPO}/${app}:${STAGING_TAG}${NC}" >&2
    exit 1
  fi
done

echo ""
echo -e "${GREEN}RTM preflight passed.${NC}"
echo -e "${GREEN}Next (operator): ./scripts/publish/sync-staging-to-main.sh${NC}"
