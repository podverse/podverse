#!/usr/bin/env bash
# Wait for a GitHub Actions workflow run triggered by a branch push to complete.
# Called by sync-develop-to-staging.sh and sync-staging-to-main.sh after push.
# Usage: wait-for-workflow.sh <workflow-file> <branch> [commit-sha]
# Requires gh CLI (gh auth login).

set -euo pipefail

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

WORKFLOW="${1:-}"
BRANCH="${2:-}"
COMMIT_SHA="${3:-}"

if [[ -z "$WORKFLOW" || -z "$BRANCH" ]]; then
  echo "Usage: wait-for-workflow.sh <workflow-file> <branch> [commit-sha]" >&2
  exit 1
fi

if ! command -v gh > /dev/null 2>&1; then
  echo -e "${RED}Error: gh CLI is required to wait for ${WORKFLOW}.${NC}" >&2
  echo -e "${YELLOW}Install gh and run: gh auth login${NC}" >&2
  exit 1
fi

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"
cd "$REPO_ROOT"

git fetch origin "$BRANCH" > /dev/null 2>&1 || true

if [[ -z "$COMMIT_SHA" ]]; then
  COMMIT_SHA=$(git rev-parse "refs/remotes/origin/${BRANCH}")
fi

echo -e "${YELLOW}Waiting for ${WORKFLOW} on ${BRANCH} (${COMMIT_SHA:0:7})...${NC}"

RUN_ID=""
for _ in $(seq 1 30); do
  RUN_ID=$(gh run list \
    --workflow="$WORKFLOW" \
    --branch="$BRANCH" \
    --limit=20 \
    --json databaseId,headSha \
    --jq "[.[] | select(.headSha == \"${COMMIT_SHA}\")][0].databaseId // empty" 2> /dev/null || true)
  if [[ -n "$RUN_ID" ]]; then
    break
  fi
  sleep 2
done

if [[ -z "$RUN_ID" ]]; then
  echo -e "${RED}Error: No ${WORKFLOW} run found for ${COMMIT_SHA} on ${BRANCH}.${NC}" >&2
  echo -e "${YELLOW}Check GitHub Actions for ${WORKFLOW} on branch ${BRANCH}.${NC}" >&2
  exit 1
fi

echo -e "${YELLOW}Watching run ${RUN_ID}...${NC}"
if gh run watch "$RUN_ID" --exit-status; then
  echo -e "${GREEN}${WORKFLOW} succeeded for ${BRANCH} (${COMMIT_SHA:0:7}).${NC}"
else
  echo -e "${RED}${WORKFLOW} failed for ${BRANCH} (${COMMIT_SHA:0:7}).${NC}" >&2
  echo -e "${YELLOW}Logs: gh run view ${RUN_ID} --log${NC}" >&2
  exit 1
fi
