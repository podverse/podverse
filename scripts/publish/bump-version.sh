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

echo -e "${YELLOW}Running security audit (moderate and above; low permitted)...${NC}"

# Call shared audit gate utility
# Keep allowlist as narrow as possible. These advisories are currently transitive-only
# via upstream dependency chains and have no safe non-breaking upgrade path yet.
# See docs/development/security/NPM-AUDIT-ALLOWLIST.md for detailed rationale and when to revisit.
if ! "$SCRIPT_DIR/../lib/check-audit-gate.sh" "1113977,1116970" "release"; then
  echo -e "${RED}Error: npm audit found disallowed moderate or higher vulnerabilities. Fix them before bumping version.${NC}"
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

CHANGELOG_DIR="$REPO_ROOT/docs/development/CHANGELOGS"
CHANGELOG_FILE="$CHANGELOG_DIR/$VERSION.md"

mkdir -p "$CHANGELOG_DIR"
if [[ ! -f "$CHANGELOG_FILE" ]]; then
  cat > "$CHANGELOG_FILE" << EOF
# Changelog $VERSION

_Update this file continuously during development for version $VERSION._

## Highlights

- Add notable changes for this version.
EOF
  echo -e "${GREEN}Created changelog file:${NC} $CHANGELOG_FILE"
fi

# Get current branch
CURRENT_BRANCH=$(git branch --show-current)
echo -e "${YELLOW}Bumping version to $VERSION on branch '$CURRENT_BRANCH'...${NC}"

if ! command -v jq &>/dev/null; then
  echo -e "${RED}Error: jq is required for workspace discovery (npm query .workspace).${NC}"
  exit 1
fi

WORKSPACE_JSON=$(npm query .workspace)
WORKSPACE_COUNT=$(echo "$WORKSPACE_JSON" | jq 'length')
if [[ "${WORKSPACE_COUNT:-0}" -lt 1 ]]; then
  echo -e "${RED}Error: npm query .workspace returned no workspaces. Use npm 8.16+ from the repo dev environment.${NC}"
  exit 1
fi
WORKSPACES=$(echo "$WORKSPACE_JSON" | jq -r '.[].location')

# Update root package.json
npm version "$VERSION" --no-git-tag-version

# Update all workspace packages
for ws in $WORKSPACES; do
  echo "  Updating $ws..."
  cd "$REPO_ROOT/$ws"
  npm version "$VERSION" --no-git-tag-version --allow-same-version
done

cd "$REPO_ROOT"

# Regenerate lockfile under Linux so CI (Linux) gets correct optional deps
echo -e "${YELLOW}Regenerating package-lock.json under Linux (Docker)...${NC}"
bash "$REPO_ROOT/scripts/development/update-lockfile-linux.sh"

# Stage changes (root + all workspaces from same list used for bumping)
git add package.json package-lock.json
for ws in $WORKSPACES; do
  git add "$ws/package.json"
  if [[ -f "$REPO_ROOT/$ws/package-lock.json" ]]; then
    git add "$ws/package-lock.json"
  fi
done
git add "$CHANGELOG_FILE"

# Commit (bypass hooks)
git commit --no-verify -m "chore: bump version to $VERSION"

# Push (bypass hooks)
echo -e "${YELLOW}Pushing to origin/$CURRENT_BRANCH...${NC}"
git push --no-verify origin "$CURRENT_BRANCH"

echo -e "${GREEN}✓ Version bumped to $VERSION and pushed${NC}"
