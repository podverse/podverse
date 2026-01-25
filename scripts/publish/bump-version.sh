#!/bin/bash
# Bump version across all packages

set -e

RED='\033[0;31m'
GREEN='\033[0;32m'
YELLOW='\033[1;33m'
NC='\033[0m'

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

# Validate version argument
VERSION="$1"
if [[ -z "$VERSION" ]]; then
  read -p "Enter version number (e.g., 5.2.1): " VERSION
fi

if [[ ! "$VERSION" =~ ^[0-9]+\.[0-9]+\.[0-9]+$ ]]; then
  echo -e "${RED}Error: Invalid version format. Expected: X.Y.Z${NC}"
  exit 1
fi

echo -e "${YELLOW}Bumping version to $VERSION...${NC}"

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

# Commit
git commit -m "chore: bump version to $VERSION"

echo -e "${GREEN}✓ Version bumped to $VERSION${NC}"
echo "Run 'git push' to push changes"
