# Phase 8: Versioning and Publishing

**Status**: Completed (Split into Sub-Plans)

## Sub-Plans

This phase has been split into smaller, manageable plans:

| Sub-Plan                                                                 | Status  | Description                               |
| ------------------------------------------------------------------------ | ------- | ----------------------------------------- |
| [08a-package-config-version-bump.md](08a-package-config-version-bump.md) | Planned | Add publishConfig, create bump-version.sh |
| [08b-publish-alpha-workflow.md](08b-publish-alpha-workflow.md)           | Planned | Create publish-alpha.yml workflow         |

**Note**: CI workflow (`.github/workflows/ci.yml`) already exists and is complete.

## Overview

Establish unified versioning across all packages and apps, with automated publishing via GitHub Actions.

## Current Process (Multi-Repo)

From `alpha-publish-all-packages.sh`:

1. Check all repos are clean and on `v5-develop`
2. Optionally bump version with `v5-develop-update-version-all.sh`
3. Build all repos to verify
4. For each repo in dependency order:
   - Run `scripts/publish/alpha/publish.sh`
   - Monitor GitHub Actions workflow
   - Wait for success before next repo

From `v5-develop-update-version-all.sh`:

1. Check for vulnerabilities (audit-all-repos.sh)
2. Validate version format (X.Y.Z)
3. For each repo:
   - `npm version $VERSION --no-git-tag-version`
   - Commit and push to v5-develop

## Monorepo Process

### Single Source of Truth

Root `package.json` holds the version:

```json
{
  "name": "podverse",
  "version": "5.2.0",
  "private": true
}
```

All workspace packages inherit this version at publish time.

### Version Bump Script

**File**: `scripts/publish/bump-version.sh`

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

### GitHub Actions Workflow

**File**: `.github/workflows/publish-alpha.yml`

```yaml
name: Publish Alpha

on:
  push:
    branches:
      - alpha

jobs:
  # Step 1: Validate everything builds
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Build all packages
        run: npm run build:packages

      - name: Build all apps
        run: npm run build:apps

  # Step 2: Publish npm packages (sequential)
  publish-packages:
    needs: validate
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          registry-url: 'https://registry.npmjs.org'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Build packages
        run: npm run build:packages

      - name: Publish helpers
        run: |
          cd packages/helpers
          npm publish --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish external-services
        run: |
          cd packages/external-services
          npm publish --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish orm
        run: |
          cd packages/orm
          npm publish --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish notifications
        run: |
          cd packages/notifications
          npm publish --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish parser
        run: |
          cd packages/parser
          npm publish --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

      - name: Publish mq
        run: |
          cd packages/mq
          npm publish --tag alpha
        env:
          NODE_AUTH_TOKEN: ${{ secrets.NPM_TOKEN }}

  # Step 3: Build and publish Docker images (parallel)
  publish-docker:
    needs: publish-packages
    runs-on: ubuntu-latest
    strategy:
      matrix:
        app: [api, web, workers, management-api, management-web]
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Install alpha packages
        run: |
          npm i @podverse/helpers@alpha --save
          npm i @podverse/external-services@alpha --save
          npm i @podverse/orm@alpha --save
          npm i @podverse/notifications@alpha --save
          npm i @podverse/parser@alpha --save
          npm i @podverse/mq@alpha --save

      - name: Determine version
        id: version
        run: |
          BASE_VERSION=$(node -p "require('./package.json').version")
          # Query GHCR for existing alpha versions
          # ... (same logic as current publish-alpha.yml)
          echo "NEXT_VERSION=$BASE_VERSION-alpha.0" >> $GITHUB_OUTPUT

      - name: Build Docker image
        run: |
          docker build -f apps/${{ matrix.app }}/Dockerfile \
            -t ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ steps.version.outputs.NEXT_VERSION }} \
            .

      - name: Login to GHCR
        uses: docker/login-action@v3
        with:
          registry: ghcr.io
          username: ${{ github.actor }}
          password: ${{ secrets.GITHUB_TOKEN }}

      - name: Push Docker image
        run: |
          docker push ghcr.io/${{ github.repository }}/${{ matrix.app }}:${{ steps.version.outputs.NEXT_VERSION }}
```

### Alpha Version Format

Same as current: `X.Y.Z-alpha.N`

- `X.Y.Z` from package.json version
- `N` auto-incremented per publish
- Reset to 0 when base version changes

### CI Workflow (PRs)

**File**: `.github/workflows/ci.yml`

```yaml
name: CI

on:
  pull_request:
    branches: [develop, alpha, beta, main]

jobs:
  validate:
    runs-on: ubuntu-latest
    steps:
      - uses: actions/checkout@v4

      - name: Setup Node.js
        uses: actions/setup-node@v4
        with:
          node-version: '22'
          cache: 'npm'

      - name: Install dependencies
        run: npm ci

      - name: Lint
        run: npm run lint

      - name: Type check
        run: npm run type-check

      - name: Build
        run: npm run build
```

## Release Workflow

### Development to Alpha

```bash
# On develop branch
./scripts/publish/bump-version.sh 5.2.1
git push origin develop

# Create PR: develop -> alpha
# Merge triggers publish-alpha.yml
```

### Manual Publish (Emergency)

```bash
# From monorepo root
npm run build:packages
cd packages/helpers && npm publish --tag alpha
cd ../external-services && npm publish --tag alpha
# ... etc
```

## Package Configuration

Each publishable package needs:

```json
{
  "name": "@podverse/helpers",
  "version": "5.2.0",
  "main": "dist/index.js",
  "types": "dist/index.d.ts",
  "files": ["dist"],
  "publishConfig": {
    "access": "public"
  }
}
```

## Secrets Required

| Secret                | Purpose                    |
| --------------------- | -------------------------- |
| `NPM_TOKEN`           | npm publish authentication |
| `GITHUB_TOKEN`        | GHCR push (automatic)      |
| `GHCR_REGISTRY_TOKEN` | Query existing Docker tags |

## Files to Create

| File                                  | Purpose             |
| ------------------------------------- | ------------------- |
| `scripts/publish/bump-version.sh`     | Version bump script |
| `.github/workflows/ci.yml`            | PR validation       |
| `.github/workflows/publish-alpha.yml` | Alpha release       |

## Estimated Effort

~6-8 hours (includes workflow testing)
