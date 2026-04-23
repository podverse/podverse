#!/bin/bash
# Sync beta branch to match develop (fast-forward merge)
# Ensures beta is a perfect mirror of develop

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

# Verify develop and beta branches exist locally
if ! git show-ref --verify --quiet refs/heads/develop; then
  echo -e "${RED}Error: Local 'develop' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b develop origin/develop${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/beta; then
  echo -e "${RED}Error: Local 'beta' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b beta origin/beta${NC}"
  exit 1
fi

# Verify remote branches exist
if ! git show-ref --verify --quiet refs/remotes/origin/develop; then
  echo -e "${RED}Error: Remote 'origin/develop' branch does not exist.${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/beta; then
  echo -e "${RED}Error: Remote 'origin/beta' branch does not exist.${NC}"
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
if ! "$SCRIPT_DIR/../lib/check-audit-gate.sh" "1113977,1116970" "promote to beta"; then
  echo -e "${RED}Error: npm audit found disallowed moderate or higher vulnerabilities in develop. Fix them before syncing to beta.${NC}"
  exit 1
fi
echo ""

# Checkout beta and update it
echo -e "${YELLOW}Updating local beta to match origin/beta...${NC}"
git checkout beta
git pull origin beta

BETA_COMMIT=$(git rev-parse beta)
ORIGIN_BETA_COMMIT=$(git rev-parse origin/beta)

if [ "$BETA_COMMIT" != "$ORIGIN_BETA_COMMIT" ]; then
  echo -e "${RED}Error: Local beta ($BETA_COMMIT) does not match origin/beta ($ORIGIN_BETA_COMMIT)${NC}"
  echo -e "${YELLOW}This should not happen after 'git pull'. Please investigate.${NC}"
  exit 1
fi

# Verify beta can fast-forward merge from develop
echo -e "${YELLOW}Verifying beta can fast-forward merge from develop...${NC}"
if ! git merge-base --is-ancestor beta develop; then
  echo -e "${RED}Error: beta is not an ancestor of develop. Fast-forward merge is not possible.${NC}"
  echo -e "${YELLOW}This means beta has commits that develop doesn't have.${NC}"
  echo -e "${YELLOW}Beta should be a perfect mirror of develop. Please investigate the divergence.${NC}"
  echo ""
  echo -e "${YELLOW}Commits in beta but not in develop:${NC}"
  git log develop..beta --oneline
  exit 1
fi

# Check if beta is already up to date
if [ "$BETA_COMMIT" == "$DEVELOP_COMMIT" ]; then
  echo -e "${GREEN}Beta is already up to date with develop. No merge needed.${NC}"
  # Return to original branch if it wasn't beta
  if [ "$CURRENT_BRANCH" != "beta" ]; then
    git checkout "$CURRENT_BRANCH"
  fi
  exit 0
fi

# Perform fast-forward merge
echo -e "${YELLOW}Merging develop into beta (fast-forward only)...${NC}"
if ! git merge develop --ff-only; then
  echo -e "${RED}Error: Fast-forward merge failed. This should not happen after validation.${NC}"
  exit 1
fi

# Verify beta now matches develop
NEW_BETA_COMMIT=$(git rev-parse beta)
if [ "$NEW_BETA_COMMIT" != "$DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After merge, beta ($NEW_BETA_COMMIT) does not match develop ($DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}Beta successfully merged with develop.${NC}"

# Push to origin (bypass hooks, similar to bump-version.sh)
# Note: This requires "Allow specified actors to bypass required pull requests" permission
# in GitHub branch protection rules for the beta branch
echo -e "${YELLOW}Pushing beta to origin (bypassing hooks)...${NC}"
if ! git push --no-verify origin beta; then
  echo -e "${RED}Error: Failed to push to origin/beta${NC}"
  echo -e "${YELLOW}This may be due to:${NC}"
  echo -e "${YELLOW}  1. Missing bypass permissions for protected branch 'beta'${NC}"
  echo -e "${YELLOW}  2. Network/authentication issues${NC}"
  echo -e "${YELLOW}${NC}"
  echo -e "${YELLOW}If you don't have bypass permissions, you'll need to:${NC}"
  echo -e "${YELLOW}  1. Create a PR from develop to beta${NC}"
  echo -e "${YELLOW}  2. Or request bypass permissions from a repository admin${NC}"
  exit 1
fi

# Final verification
echo -e "${YELLOW}Verifying beta matches develop after push...${NC}"
git fetch origin
FINAL_BETA_COMMIT=$(git rev-parse origin/beta)
FINAL_DEVELOP_COMMIT=$(git rev-parse origin/develop)

if [ "$FINAL_BETA_COMMIT" != "$FINAL_DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After push, origin/beta ($FINAL_BETA_COMMIT) does not match origin/develop ($FINAL_DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Beta is now a perfect mirror of develop${NC}"
echo -e "${GREEN}✓ Changes pushed to origin/beta${NC}"

# Return to original branch if it wasn't beta
if [ "$CURRENT_BRANCH" != "beta" ]; then
  echo -e "${YELLOW}Returning to original branch: $CURRENT_BRANCH${NC}"
  git checkout "$CURRENT_BRANCH"
fi
