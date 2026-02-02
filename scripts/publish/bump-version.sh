#!/bin/bash
# Bump version across all packages
# Uses --no-verify to bypass git hooks
# Requires branch protection bypass permissions in GitHub for the user

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo -e "${YELLOW}Running security audit...${NC}"
if ! npm audit; then
  echo -e "${RED}Error: npm audit found vulnerabilities. Fix them before bumping version.${NC}"
  exit 1
fi
echo ""

# Show current version from root package.json and prompt for next
CURRENT_VERSION=$(node --input-type=module -e "import { readFileSync } from 'fs'; const pkg = JSON.parse(readFileSync('./package.json', 'utf8')); console.log(pkg.version)")
echo -e "Current version (root package.json): ${GREEN}$CURRENT_VERSION${NC}"
echo ""
read -p "Enter next version (e.g., 5.2.3): " VERSION

if [[ -z "$VERSION" ]]; then
  echo -e "${RED}Error: No version entered. Aborting.${NC}"
  exit 1
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: Invalid version format. Expected: X.Y.Z (e.g., 5.2.3)${NC}"
  exit 1
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Bumping version to $VERSION on branch '$CURRENT_BRANCH'...${NC}"

# Update root package.json
npm version "$VERSION" --no-git-tag-version

# Update all workspace packages
WORKSPACES=$(npm query .workspace | jq -r '.[].location')
for ws in $WORKSPACES; do
  echo "  Updating $ws..."
  cd "$REPO_ROOT/$ws"
  npm version "$VERSION" --no-git-tag-version --allow-same-version
done

cd "$REPO_ROOT"

# Stage changes
git add package.json package-lock.json
git add packages/*/package.json
git add apps/*/package.json
git add tools/*/package.json

# Commit (bypass hooks)
git commit --no-verify -m "chore: bump version to $VERSION"

# Push (bypass hooks)
echo -e "${YELLOW}Pushing to origin/$CURRENT_BRANCH...${NC}"
git push --no-verify origin "$CURRENT_BRANCH"

echo -e "${GREEN}✓ Version bumped to $VERSION and pushed${NC}"
