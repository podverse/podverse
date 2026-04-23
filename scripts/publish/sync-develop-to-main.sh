#!/bin/bash
# Sync main branch to match develop (fast-forward merge)
# Ensures main is a perfect mirror of develop

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

# Check for uncommitted changes
if ! git diff-index --quiet HEAD --; then
  echo -e "${RED}Error: You have uncommitted changes. Please commit or stash them first.${NC}"
  echo -e "${YELLOW}Run 'git status' to see what needs to be handled.${NC}"
  exit 1
fi

# Check for untracked files that might cause issues
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

# Verify develop and main branches exist locally
if ! git show-ref --verify --quiet refs/heads/develop; then
  echo -e "${RED}Error: Local 'develop' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b develop origin/develop${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/main; then
  echo -e "${RED}Error: Local 'main' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b main origin/main${NC}"
  exit 1
fi

# Verify remote branches exist
if ! git show-ref --verify --quiet refs/remotes/origin/develop; then
  echo -e "${RED}Error: Remote 'origin/develop' branch does not exist.${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/main; then
  echo -e "${RED}Error: Remote 'origin/main' branch does not exist.${NC}"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Current branch: $CURRENT_BRANCH${NC}"

# Update local develop to match remote
echo -e "${YELLOW}Updating local develop to match origin/develop...${NC}"
git checkout develop
git pull origin develop

# Get commit hashes for comparison
DEVELOP_COMMIT=$(git rev-parse develop)
ORIGIN_DEVELOP_COMMIT=$(git rev-parse origin/develop)

if [ "$DEVELOP_COMMIT" != "$ORIGIN_DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: Local develop ($DEVELOP_COMMIT) does not match origin/develop ($ORIGIN_DEVELOP_COMMIT)${NC}"
  echo -e "${YELLOW}This should not happen after 'git pull'. Please investigate.${NC}"
  exit 1
fi

echo -e "${YELLOW}Running security audit on develop (moderate and above; low permitted)...${NC}"
npm ci

# Call shared audit gate utility
# Keep allowlist as narrow as possible. These advisories are currently transitive-only
# via upstream dependency chains and have no safe non-breaking upgrade path yet.
# See docs/development/NPM-AUDIT-ALLOWLIST.md for detailed rationale and when to revisit.
if ! "$SCRIPT_DIR/../lib/check-audit-gate.sh" "1113977,1116970" "promote to main"; then
  echo -e "${RED}Error: npm audit found disallowed moderate or higher vulnerabilities in develop. Fix them before syncing to main.${NC}"
  exit 1
fi
echo ""

# Checkout main and update it
echo -e "${YELLOW}Updating local main to match origin/main...${NC}"
git checkout main
git pull origin main

MAIN_COMMIT=$(git rev-parse main)
ORIGIN_MAIN_COMMIT=$(git rev-parse origin/main)

if [ "$MAIN_COMMIT" != "$ORIGIN_MAIN_COMMIT" ]; then
  echo -e "${RED}Error: Local main ($MAIN_COMMIT) does not match origin/main ($ORIGIN_MAIN_COMMIT)${NC}"
  echo -e "${YELLOW}This should not happen after 'git pull'. Please investigate.${NC}"
  exit 1
fi

# Verify main can fast-forward merge from develop
echo -e "${YELLOW}Verifying main can fast-forward merge from develop...${NC}"
if ! git merge-base --is-ancestor main develop; then
  echo -e "${RED}Error: main is not an ancestor of develop. Fast-forward merge is not possible.${NC}"
  echo -e "${YELLOW}This means main has commits that develop doesn't have.${NC}"
  echo -e "${YELLOW}Main should be a perfect mirror of develop. Please investigate the divergence.${NC}"
  echo ""
  echo -e "${YELLOW}Commits in main but not in develop:${NC}"
  git log develop..main --oneline
  exit 1
fi

# Check if main is already up to date
if [ "$MAIN_COMMIT" == "$DEVELOP_COMMIT" ]; then
  echo -e "${GREEN}Main is already up to date with develop. No merge needed.${NC}"
  # Return to original branch if it wasn't main
  if [ "$CURRENT_BRANCH" != "main" ]; then
    git checkout "$CURRENT_BRANCH"
  fi
  exit 0
fi

# Perform fast-forward merge
echo -e "${YELLOW}Merging develop into main (fast-forward only)...${NC}"
if ! git merge develop --ff-only; then
  echo -e "${RED}Error: Fast-forward merge failed. This should not happen after validation.${NC}"
  exit 1
fi

# Verify main now matches develop
NEW_MAIN_COMMIT=$(git rev-parse main)
if [ "$NEW_MAIN_COMMIT" != "$DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After merge, main ($NEW_MAIN_COMMIT) does not match develop ($DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}Main successfully merged with develop.${NC}"

# Push to origin (bypass hooks, similar to bump-version.sh)
# Note: This requires "Allow specified actors to bypass required pull requests" permission
# in GitHub branch protection rules for the main branch
echo -e "${YELLOW}Pushing main to origin (bypassing hooks)...${NC}"
if ! git push --no-verify origin main; then
  echo -e "${RED}Error: Failed to push to origin/main${NC}"
  echo -e "${YELLOW}This may be due to:${NC}"
  echo -e "${YELLOW}  1. Missing bypass permissions for protected branch 'main'${NC}"
  echo -e "${YELLOW}  2. Network/authentication issues${NC}"
  echo -e "${YELLOW}${NC}"
  echo -e "${YELLOW}If you don't have bypass permissions, you'll need to:${NC}"
  echo -e "${YELLOW}  1. Create a PR from develop to main${NC}"
  echo -e "${YELLOW}  2. Or request bypass permissions from a repository admin${NC}"
  exit 1
fi

# Final verification
echo -e "${YELLOW}Verifying main matches develop after push...${NC}"
git fetch origin
FINAL_MAIN_COMMIT=$(git rev-parse origin/main)
FINAL_DEVELOP_COMMIT=$(git rev-parse origin/develop)

if [ "$FINAL_MAIN_COMMIT" != "$FINAL_DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After push, origin/main ($FINAL_MAIN_COMMIT) does not match origin/develop ($FINAL_DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Main is now a perfect mirror of develop${NC}"
echo -e "${GREEN}✓ Changes pushed to origin/main${NC}"

# Return to original branch if it wasn't main
if [ "$CURRENT_BRANCH" != "main" ]; then
  echo -e "${YELLOW}Returning to original branch: $CURRENT_BRANCH${NC}"
  git checkout "$CURRENT_BRANCH"
fi
