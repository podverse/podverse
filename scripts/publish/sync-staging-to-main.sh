#!/usr/bin/env bash
# Fast-forward `main` to match `staging` (triggers Publish (main) — promote-only, no app rebuild).
# Intended flow: sync develop -> staging (build in GH), then this script: staging -> main (RTM).
# Do not use develop -> main; `main` should only advance from the pre-built staging line.

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
  echo -e "${YELLOW}Run 'git status' to see what needs to be handled.${NC}"
  exit 1
fi

if [ -n "$(git ls-files --others --exclude-standard)" ]; then
  echo -e "${YELLOW}Warning: You have untracked files. These won't affect the merge but may be unexpected.${NC}"
  read -p "Continue anyway? (y/N) " -n 1 -r
  echo
  if [[ ! $REPLY =~ ^[Yy]$ ]]; then
    exit 1
  fi
fi

echo -e "${YELLOW}Fetching latest from origin...${NC}"
git fetch origin

if ! git show-ref --verify --quiet refs/heads/staging; then
  echo -e "${RED}Error: Local 'staging' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b staging origin/staging${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/main; then
  echo -e "${RED}Error: Local 'main' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b main origin/main${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/staging; then
  echo -e "${RED}Error: Remote 'origin/staging' branch does not exist.${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/main; then
  echo -e "${RED}Error: Remote 'origin/main' branch does not exist.${NC}"
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

echo -e "${YELLOW}Updating local staging to match origin/staging...${NC}"
git switch staging
git merge --ff-only refs/remotes/origin/staging

STAGING_COMMIT=$(git rev-parse refs/heads/staging)
ORIGIN_STAGING_COMMIT=$(git rev-parse refs/remotes/origin/staging)

if [ "$STAGING_COMMIT" != "$ORIGIN_STAGING_COMMIT" ]; then
  echo -e "${RED}Error: Local staging ($STAGING_COMMIT) does not match origin/staging ($ORIGIN_STAGING_COMMIT)${NC}"
  echo -e "${YELLOW}This should not happen after 'git pull'. Please investigate.${NC}"
  exit 1
fi

echo -e "${YELLOW}Running security audit on staging (moderate and above; low permitted)...${NC}"
npm ci

# Moderate+ audit; allowlist 1117015 (next nested postcss). See NPM-AUDIT-ALLOWLIST.md.
# Mobile-only trees are skipped by the gate (separate mobile release track).
if ! "$SCRIPT_DIR/../lib/check-audit-gate.sh" "1117015" "promote to main (staging to main)"; then
  echo -e "${RED}Error: npm audit found disallowed moderate or higher vulnerabilities. Fix them before promoting to main.${NC}"
  exit 1
fi
echo ""

echo -e "${YELLOW}Updating local main to match origin/main...${NC}"
git switch main
git merge --ff-only refs/remotes/origin/main

MAIN_COMMIT=$(git rev-parse refs/heads/main)
ORIGIN_MAIN_COMMIT=$(git rev-parse refs/remotes/origin/main)

if [ "$MAIN_COMMIT" != "$ORIGIN_MAIN_COMMIT" ]; then
  echo -e "${RED}Error: Local main ($MAIN_COMMIT) does not match origin/main ($ORIGIN_MAIN_COMMIT)${NC}"
  echo -e "${YELLOW}This should not happen after 'git pull'. Please investigate.${NC}"
  exit 1
fi

echo -e "${YELLOW}Verifying main can fast-forward merge from staging...${NC}"
if ! git merge-base --is-ancestor refs/heads/main refs/heads/staging; then
  echo -e "${RED}Error: main is not an ancestor of staging. Fast-forward merge is not possible.${NC}"
  echo -e "${YELLOW}This means main has commits that staging doesn't have, or the branches have diverged.${NC}"
  echo -e "${YELLOW}Commits in main but not in staging:${NC}"
  git log refs/heads/staging..refs/heads/main --oneline
  exit 1
fi

if [ "$MAIN_COMMIT" == "$STAGING_COMMIT" ]; then
  echo -e "${GREEN}Main is already up to date with staging. No merge needed.${NC}"
  if [ "$CURRENT_BRANCH" != "main" ]; then
    git checkout "$CURRENT_BRANCH"
  fi
  exit 0
fi

echo -e "${YELLOW}Merging staging into main (fast-forward only)...${NC}"
if ! git merge refs/heads/staging --ff-only; then
  echo -e "${RED}Error: Fast-forward merge failed. This should not happen after validation.${NC}"
  exit 1
fi

NEW_MAIN_COMMIT=$(git rev-parse refs/heads/main)
if [ "$NEW_MAIN_COMMIT" != "$STAGING_COMMIT" ]; then
  echo -e "${RED}Error: After merge, main ($NEW_MAIN_COMMIT) does not match staging ($STAGING_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}Main successfully merged with staging.${NC}"

echo -e "${YELLOW}Pushing main to origin (bypassing hooks)...${NC}"
if ! git push --no-verify origin refs/heads/main:refs/heads/main; then
  echo -e "${RED}Error: Failed to push to origin/main${NC}"
  echo -e "${YELLOW}This may be due to:${NC}"
  echo -e "${YELLOW}  1. Missing bypass permissions for protected branch 'main'${NC}"
  echo -e "${YELLOW}  2. Network/authentication issues${NC}"
  echo -e "${YELLOW}${NC}"
  echo -e "${YELLOW}If you don't have bypass permissions, use a PR from staging to main.${NC}"
  exit 1
fi

echo -e "${YELLOW}Verifying main matches staging after push...${NC}"
git fetch origin
FINAL_MAIN_COMMIT=$(git rev-parse refs/remotes/origin/main)
FINAL_STAGING_COMMIT=$(git rev-parse refs/remotes/origin/staging)

if [ "$FINAL_MAIN_COMMIT" != "$FINAL_STAGING_COMMIT" ]; then
  echo -e "${RED}Error: After push, origin/main ($FINAL_MAIN_COMMIT) does not match origin/staging ($FINAL_STAGING_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Main is now a perfect mirror of staging (RTM line)${NC}"
echo -e "${GREEN}✓ Changes pushed to origin/main${NC}"

"$SCRIPT_DIR/wait-for-workflow.sh" publish-main.yml main "$FINAL_MAIN_COMMIT"

echo -e "${YELLOW}Verifying production tags in GHCR...${NC}"
"$SCRIPT_DIR/../ghcr/verifyProductionTags.sh"

if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${YELLOW}Returning to original branch: $CURRENT_BRANCH${NC}"
  git checkout "$CURRENT_BRANCH"
fi
