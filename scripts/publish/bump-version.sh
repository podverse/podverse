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
AUDIT_REPORT_FILE_PATH="$(mktemp)"

# Keep this list as narrow as possible. These advisories are currently transitive-only
# via upstream dependency chains and have no safe non-breaking upgrade path yet.
# See docs/development/NPM-AUDIT-ALLOWLIST.md for detailed rationale and when to revisit.
ALLOWED_AUDIT_IDS="1113977,1116970"

# npm audit exits non-zero when vulnerabilities are present; we parse JSON ourselves below.
npm audit --omit=dev --json > "$AUDIT_REPORT_FILE_PATH" || true

if ! AUDIT_REPORT_FILE="$AUDIT_REPORT_FILE_PATH" ALLOWED_AUDIT_IDS="$ALLOWED_AUDIT_IDS" node --input-type=module <<'NODE'
import { readFileSync } from 'node:fs';

const reportPath = process.env.AUDIT_REPORT_FILE;
const allowedRaw = process.env.ALLOWED_AUDIT_IDS ?? '';

if (!reportPath) {
  console.error('Missing AUDIT_REPORT_FILE path.');
  process.exit(1);
}

const allowedIds = new Set(
  allowedRaw
    .split(',')
    .map((id) => id.trim())
    .filter((id) => id.length > 0)
);

const severityRank = {
  info: 0,
  low: 1,
  moderate: 2,
  high: 3,
  critical: 4,
};

const jsonText = readFileSync(reportPath, 'utf8');
const audit = JSON.parse(jsonText);
const vulnerabilities = audit.vulnerabilities ?? {};
const failures = [];

for (const [pkgName, pkg] of Object.entries(vulnerabilities)) {
  const via = Array.isArray(pkg.via) ? pkg.via : [];
  for (const advisory of via) {
    if (typeof advisory === 'string') {
      continue;
    }

    const severity = advisory.severity ?? 'low';
    if ((severityRank[severity] ?? 0) < severityRank.moderate) {
      continue;
    }

    const sourceId = advisory.source !== undefined ? String(advisory.source) : '';
    if (sourceId.length > 0 && allowedIds.has(sourceId)) {
      continue;
    }

    failures.push({
      package: pkgName,
      sourceId,
      severity,
      title: advisory.title ?? 'Untitled advisory',
      url: advisory.url ?? '',
    });
  }
}

if (failures.length > 0) {
  console.error('Disallowed moderate+ advisories detected:');
  for (const advisory of failures) {
    const idSuffix = advisory.sourceId ? ` (${advisory.sourceId})` : '';
    const urlSuffix = advisory.url ? ` - ${advisory.url}` : '';
    console.error(
      `- ${advisory.severity.toUpperCase()} ${advisory.package}${idSuffix}: ${advisory.title}${urlSuffix}`
    );
  }
  process.exit(1);
}

console.log(`Audit gate passed. Allowed advisory IDs: ${allowedRaw}`);
NODE
then
  rm -f "$AUDIT_REPORT_FILE_PATH"
  echo -e "${RED}Error: npm audit found disallowed moderate or higher vulnerabilities. Fix them before bumping version.${NC}"
  exit 1
fi

rm -f "$AUDIT_REPORT_FILE_PATH"
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

# Commit (bypass hooks)
git commit --no-verify -m "chore: bump version to $VERSION"

# Push (bypass hooks)
echo -e "${YELLOW}Pushing to origin/$CURRENT_BRANCH...${NC}"
git push --no-verify origin "$CURRENT_BRANCH"

echo -e "${GREEN}✓ Version bumped to $VERSION and pushed${NC}"
