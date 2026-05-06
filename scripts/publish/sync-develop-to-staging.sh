#!/bin/bash
# Fast-forward `staging` to match `develop` (triggers the Publish (staging) workflow on push).

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

if ! git show-ref --verify --quiet refs/heads/develop; then
  echo -e "${RED}Error: Local 'develop' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b develop origin/develop${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/staging; then
  echo -e "${RED}Error: Local 'staging' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b staging origin/staging${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/develop; then
  echo -e "${RED}Error: Remote 'origin/develop' branch does not exist.${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/staging; then
  echo -e "${RED}Error: Remote 'origin/staging' branch does not exist.${NC}"
  exit 1
fi

CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

echo -e "${YELLOW}Updating local develop to match origin/develop...${NC}"
git switch develop
git merge --ff-only refs/remotes/origin/develop

DEVELOP_COMMIT=$(git rev-parse refs/heads/develop)
ORIGIN_DEVELOP_COMMIT=$(git rev-parse refs/remotes/origin/develop)

if [ "$DEVELOP_COMMIT" != "$ORIGIN_DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: Local develop ($DEVELOP_COMMIT) does not match origin/develop ($ORIGIN_DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${YELLOW}Running security audit on develop (moderate and above; low permitted)...${NC}"
echo -e "${YELLOW}Using Linux Docker so npm ci matches CI (linux-canonical lockfile / optional natives).${NC}"

if ! command -v docker &>/dev/null; then
  echo -e "${RED}Error: Docker is required for this step. Install Docker and retry.${NC}"
  exit 1
fi

NODE_IMAGE="${SYNC_STAGING_NODE_IMAGE:-node:24}"
DOCKER_PLATFORM="${LOCKFILE_DOCKER_PLATFORM:-linux/amd64}"

if [[ "$(uname -s)" == "Darwin" && "$(uname -m)" == "arm64" && "$DOCKER_PLATFORM" == "linux/amd64" ]]; then
  echo -e "${YELLOW}Note: emulated linux/amd64 on Apple Silicon can be slow or fail during optional native installs.${NC}"
  echo -e "${YELLOW}      If needed: LOCKFILE_DOCKER_PLATFORM=linux/arm64 (see docs/development/tooling/LOCKFILE-LINUX.md).${NC}"
  echo ""
fi

if ! docker run --rm \
  --platform "$DOCKER_PLATFORM" \
  -v "$REPO_ROOT:/app" \
  -w /app \
  "$NODE_IMAGE" \
  bash -c 'npm ci --include=optional && bash scripts/lib/check-audit-gate.sh "" "promote to staging"'; then
  echo -e "${RED}Error: npm ci or npm audit gate failed in Docker. Fix issues before syncing to staging.${NC}"
  exit 1
fi

echo -e "${YELLOW}Note: node_modules now matches Linux optional deps from Docker. For local macOS dev, reinstall deps (e.g. rm -rf node_modules && npm install).${NC}"
echo ""

echo -e "${YELLOW}Updating local staging to match origin/staging...${NC}"
git switch staging
git merge --ff-only refs/remotes/origin/staging

STAGING_COMMIT=$(git rev-parse refs/heads/staging)
ORIGIN_STAGING_COMMIT=$(git rev-parse refs/remotes/origin/staging)

if [ "$STAGING_COMMIT" != "$ORIGIN_STAGING_COMMIT" ]; then
  echo -e "${RED}Error: Local staging ($STAGING_COMMIT) does not match origin/staging ($ORIGIN_STAGING_COMMIT)${NC}"
  exit 1
fi

echo -e "${YELLOW}Verifying staging can fast-forward merge from develop...${NC}"
if ! git merge-base --is-ancestor refs/heads/staging refs/heads/develop; then
  echo -e "${RED}Error: staging is not an ancestor of develop. Fast-forward merge is not possible.${NC}"
  echo -e "${YELLOW}Commits in staging but not in develop:${NC}"
  git log refs/heads/develop..refs/heads/staging --oneline
  exit 1
fi

if [ "$STAGING_COMMIT" == "$DEVELOP_COMMIT" ]; then
  echo -e "${GREEN}Staging is already up to date with develop. No merge needed.${NC}"
  if [ "$CURRENT_BRANCH" != "staging" ]; then
    git checkout "$CURRENT_BRANCH"
  fi
  exit 0
fi

echo -e "${YELLOW}Merging develop into staging (fast-forward only)...${NC}"
if ! git merge refs/heads/develop --ff-only; then
  echo -e "${RED}Error: Fast-forward merge failed.${NC}"
  exit 1
fi

NEW_STAGING_COMMIT=$(git rev-parse refs/heads/staging)
if [ "$NEW_STAGING_COMMIT" != "$DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After merge, staging ($NEW_STAGING_COMMIT) does not match develop ($DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}Staging successfully merged with develop.${NC}"

echo -e "${YELLOW}Pushing staging to origin (bypassing hooks)...${NC}"
if ! git push --no-verify origin refs/heads/staging:refs/heads/staging; then
  echo -e "${RED}Error: Failed to push to origin/staging${NC}"
  echo -e "${YELLOW}  1. Missing bypass permissions for protected branch 'staging'${NC}"
  echo -e "${YELLOW}  2. Or use a PR from develop to staging${NC}"
  exit 1
fi

echo -e "${YELLOW}Verifying staging matches develop after push...${NC}"
git fetch origin
FINAL_STAGING_COMMIT=$(git rev-parse refs/remotes/origin/staging)
FINAL_DEVELOP_COMMIT=$(git rev-parse refs/remotes/origin/develop)

if [ "$FINAL_STAGING_COMMIT" != "$FINAL_DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After push, origin/staging ($FINAL_STAGING_COMMIT) does not match origin/develop ($FINAL_DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Staging is now a perfect mirror of develop${NC}"
echo -e "${GREEN}✓ Changes pushed to origin/staging${NC}"

if [ "$CURRENT_BRANCH" != "staging" ]; then
  echo -e "${YELLOW}Returning to original branch: $CURRENT_BRANCH${NC}"
  git checkout "$CURRENT_BRANCH"
fi
