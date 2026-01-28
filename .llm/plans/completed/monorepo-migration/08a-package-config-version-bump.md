# Phase 8A: Package Config and Version Bump Script

**Status**: Completed
**Estimated Effort**: 1-2 hours
**Prerequisite For**: 08b-publish-alpha-workflow.md

## Overview

Configure npm packages for public publishing and create a unified version bump script.

## Tasks

### 1. Add publishConfig to All Packages

Each of the 6 publishable packages needs `publishConfig` for scoped public publishing:

```json
"publishConfig": {
  "access": "public"
}
```

**Files to modify:**

- [ ] `packages/helpers/package.json`
- [ ] `packages/external-services/package.json`
- [ ] `packages/orm/package.json`
- [ ] `packages/notifications/package.json`
- [ ] `packages/parser/package.json`
- [ ] `packages/mq/package.json`

### 2. Create Version Bump Script

**File**: `scripts/publish/bump-version.sh`

Script requirements:

- Accept version as argument or prompt for it
- Validate version format (X.Y.Z)
- Update root `package.json` version
- Update all workspace package versions
- Stage changes for commit
- Display summary of changes

Based on the original plan:

```bash
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
```

## Verification

After completing the tasks:

1. **Verify publishConfig works:**

   ```bash
   cd packages/helpers
   npm pack --dry-run
   ```

   Should show package name without errors about access.

2. **Test bump script:**
   ```bash
   # Dry run - don't actually commit
   ./scripts/publish/bump-version.sh 5.2.1
   git diff  # Review changes
   git reset --hard HEAD  # Undo if testing
   ```

## Checklist

- [ ] publishConfig added to all 6 packages
- [ ] bump-version.sh created and executable
- [ ] Script tested with dry run
- [ ] npm pack --dry-run succeeds for packages
