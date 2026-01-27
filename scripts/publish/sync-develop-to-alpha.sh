#!/bin/bash
# Sync alpha branch to match develop (fast-forward merge)
# Ensures alpha is a perfect mirror of develop

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

# Verify develop and alpha branches exist locally
if ! git show-ref --verify --quiet refs/heads/develop; then
  echo -e "${RED}Error: Local 'develop' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b develop origin/develop${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/heads/alpha; then
  echo -e "${RED}Error: Local 'alpha' branch does not exist.${NC}"
  echo -e "${YELLOW}Run: git checkout -b alpha origin/alpha${NC}"
  exit 1
fi

# Verify remote branches exist
if ! git show-ref --verify --quiet refs/remotes/origin/develop; then
  echo -e "${RED}Error: Remote 'origin/develop' branch does not exist.${NC}"
  exit 1
fi

if ! git show-ref --verify --quiet refs/remotes/origin/alpha; then
  echo -e "${RED}Error: Remote 'origin/alpha' branch does not exist.${NC}"
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

# Checkout alpha and update it
echo -e "${YELLOW}Updating local alpha to match origin/alpha...${NC}"
git checkout alpha
git pull origin alpha

ALPHA_COMMIT=$(git rev-parse alpha)
ORIGIN_ALPHA_COMMIT=$(git rev-parse origin/alpha)

if [ "$ALPHA_COMMIT" != "$ORIGIN_ALPHA_COMMIT" ]; then
  echo -e "${RED}Error: Local alpha ($ALPHA_COMMIT) does not match origin/alpha ($ORIGIN_ALPHA_COMMIT)${NC}"
  echo -e "${YELLOW}This should not happen after 'git pull'. Please investigate.${NC}"
  exit 1
fi

# Verify alpha can fast-forward merge from develop
echo -e "${YELLOW}Verifying alpha can fast-forward merge from develop...${NC}"
if ! git merge-base --is-ancestor alpha develop; then
  echo -e "${RED}Error: alpha is not an ancestor of develop. Fast-forward merge is not possible.${NC}"
  echo -e "${YELLOW}This means alpha has commits that develop doesn't have.${NC}"
  echo -e "${YELLOW}Alpha should be a perfect mirror of develop. Please investigate the divergence.${NC}"
  echo ""
  echo -e "${YELLOW}Commits in alpha but not in develop:${NC}"
  git log develop..alpha --oneline
  exit 1
fi

# Check if alpha is already up to date
if [ "$ALPHA_COMMIT" == "$DEVELOP_COMMIT" ]; then
  echo -e "${GREEN}Alpha is already up to date with develop. No merge needed.${NC}"
  # Return to original branch if it wasn't alpha
  if [ "$CURRENT_BRANCH" != "alpha" ]; then
    git checkout "$CURRENT_BRANCH"
  fi
  exit 0
fi

# Perform fast-forward merge
echo -e "${YELLOW}Merging develop into alpha (fast-forward only)...${NC}"
if ! git merge develop --ff-only; then
  echo -e "${RED}Error: Fast-forward merge failed. This should not happen after validation.${NC}"
  exit 1
fi

# Verify alpha now matches develop
NEW_ALPHA_COMMIT=$(git rev-parse alpha)
if [ "$NEW_ALPHA_COMMIT" != "$DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After merge, alpha ($NEW_ALPHA_COMMIT) does not match develop ($DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}Alpha successfully merged with develop.${NC}"

# Push to origin
echo -e "${YELLOW}Pushing alpha to origin...${NC}"
git push origin alpha

# Final verification
echo -e "${YELLOW}Verifying alpha matches develop after push...${NC}"
git fetch origin
FINAL_ALPHA_COMMIT=$(git rev-parse origin/alpha)
FINAL_DEVELOP_COMMIT=$(git rev-parse origin/develop)

if [ "$FINAL_ALPHA_COMMIT" != "$FINAL_DEVELOP_COMMIT" ]; then
  echo -e "${RED}Error: After push, origin/alpha ($FINAL_ALPHA_COMMIT) does not match origin/develop ($FINAL_DEVELOP_COMMIT)${NC}"
  exit 1
fi

echo -e "${GREEN}✓ Alpha is now a perfect mirror of develop${NC}"
echo -e "${GREEN}✓ Changes pushed to origin/alpha${NC}"

# Return to original branch if it wasn't alpha
if [ "$CURRENT_BRANCH" != "alpha" ]; then
  echo -e "${YELLOW}Returning to original branch: $CURRENT_BRANCH${NC}"
  git checkout "$CURRENT_BRANCH"
fi
