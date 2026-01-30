# Alpha Deployment Guide

This document describes how to deploy to the alpha environment for testing.

## Overview

The alpha environment is a pre-production testing environment. Docker images are built and pushed to GitHub Container Registry (GHCR) when:

1. Changes are pushed to the `alpha` branch
2. The workflow is manually triggered via GitHub Actions UI or CLI

**Important:** The `alpha` branch is a trigger branch only - it should always mirror `develop` exactly with no divergent commits.

```mermaid
flowchart TD
    subgraph trigger [Trigger Options]
        A[Push to alpha branch]
        B[Manual workflow_dispatch]
    end

    trigger --> C[Validate Job]
    C --> D{Passes?}
    D -->|No| E[Fail - Check Logs]
    D -->|Yes| F[Build Docker Images]

    subgraph parallel [Parallel Builds]
        F --> G[api]
        F --> H[web-deploy]
        F --> I[workers]
        F --> J[management-api]
        F --> K[management-web-deploy]
    end

    parallel --> L[Push to GHCR]
    L --> M[Deploy to Alpha Server]
```

## Prerequisites

### GitHub Access

- Write access to the podverse/podverse repository
- Ability to push to the `alpha` branch (bypass branch protection if enabled)

### Required Secrets (Already Configured)

See [docs/modules/SECRETS.md](modules/SECRETS.md) for details:

- `GHCR_REGISTRY_TOKEN` - Query existing Docker tags for version incrementing
- `GITHUB_TOKEN` - Automatic, used for GHCR push

### Local Tools (Optional, for CLI workflows)

```bash
# GitHub CLI for workflow management
brew install gh
gh auth login

# Docker for local build testing
brew install --cask docker
```

## Testing Locally (Before Pushing)

Before triggering the alpha workflow, validate your changes locally.

### Quick Validation (Recommended)

```bash
# Run all CI checks with a single command
make validate
```

This runs: security audit, lint, type-check, build packages, and build apps.

### Full Validation with Docker

```bash
# Run all CI checks AND build all Docker images locally
make validate_docker
```

This is the most thorough test - if this passes, the alpha workflow should succeed.

### Manual Steps (Alternative)

If you prefer to run steps individually:

```bash
# 1. Ensure you're on develop and up to date
git checkout develop
git pull origin develop

# 2. Run vulnerability check
./scripts/audit/audit.sh

# 3. Run the full CI validation locally
npm ci
npm run lint
npm run type-check
npm run build:packages
npm run build:apps

# 4. Test Docker builds locally (optional but recommended)
docker build -f apps/api/Dockerfile -t test-api .
docker build -f apps/web/Dockerfile --build-arg ENV_FILE=apps/web/env/alpha.env -t test-web .
docker build -f apps/workers/Dockerfile -t test-workers .
docker build -f apps/management-api/Dockerfile -t test-management-api .
docker build -f apps/management-web/Dockerfile --build-arg ENV_FILE=apps/management-web/env/alpha.env -t test-management-web .
```

## Standard Release Flow

### Step 1: Bump Version (Optional)

If releasing a new version:

```bash
# On develop branch
./scripts/publish/bump-version.sh
# Script shows current version, prompts for next version, then commits and pushes with --no-verify
```

**Note:** This script bypasses git hooks and pushes directly. To push to protected branches like `develop`, your GitHub user must have "Allow specified actors to bypass required pull requests" permission configured in the repository's branch protection rules.

### Step 2: Push to Alpha Branch

Since `alpha` is a trigger branch that should mirror `develop`, merge develop into alpha:

**Recommended: Use the helper script** (validates state and ensures safety):

```bash
./scripts/publish/sync-develop-to-alpha.sh
```

The script will:

- Check for uncommitted changes (prevents unexpected results)
- Verify that alpha can fast-forward merge from develop
- Ensure alpha is a perfect mirror of develop
- Perform the merge and push automatically

**Note:** The script uses `--no-verify` to bypass git hooks when pushing, similar to `bump-version.sh`. To push to the protected `alpha` branch, your GitHub user must have "Allow specified actors to bypass required pull requests" permission configured in the repository's branch protection rules. If you don't have this permission, the script will provide guidance on creating a PR instead.

**Manual method** (if you prefer to do it manually):

```bash
# Merge develop into alpha (fast-forward)
git checkout alpha
git merge develop --ff-only
git push --no-verify origin alpha
```

**Note:** The manual method also requires bypass permissions for the protected `alpha` branch. If you don't have permissions, you'll need to create a Pull Request from `develop` to `alpha` instead.

### Step 3: Monitor the Workflow

```bash
# Watch the workflow run
gh run watch

# Or list recent runs
gh run list --workflow=publish-alpha.yml

# View specific run logs
gh run view < run-id > --log
```

## Manual Trigger (Emergency/Testing)

### Via GitHub UI

1. Go to **Actions** > **Publish Alpha**
2. Click **Run workflow** dropdown
3. Optionally enter a version override (e.g., `5.2.1-hotfix`)
4. Click **Run workflow**

### Via CLI

```bash
# Trigger with default version (from package.json)
gh workflow run publish-alpha.yml

# Trigger with custom version
gh workflow run publish-alpha.yml -f version_override=5.2.1-hotfix

# Watch the triggered run
gh run watch
```

## Verifying the Deployment

### Check Workflow Status

```bash
# List recent workflow runs
gh run list --workflow=publish-alpha.yml

# View detailed logs for a run
gh run view < run-id > --log

# View failed job logs only
gh run view < run-id > --log-failed
```

### Verify Docker Images

Note: web images are published as `web-deploy` and `management-web-deploy` because Next.js requires env vars at build time.

```bash
# Pull and verify images exist
docker pull ghcr.io/podverse/podverse/api:alpha
docker pull ghcr.io/podverse/podverse/web-deploy:alpha
docker pull ghcr.io/podverse/podverse/workers:alpha
docker pull ghcr.io/podverse/podverse/management-api:alpha
docker pull ghcr.io/podverse/podverse/management-web-deploy:alpha

# Check image tags via GitHub API
gh api /orgs/podverse/packages/container/podverse%2Fapi/versions --jq '.[0:3]'
```

## Deploying to Alpha Server

Once images are published to GHCR, deploy them to the alpha server:

### Using Makefile (Recommended)

```bash
# Pull latest images and restart services
make -f Makefile.alpha alpha_api_down
make -f Makefile.alpha alpha_api_up

make -f Makefile.alpha alpha_web_down
make -f Makefile.alpha alpha_web_up

make -f Makefile.alpha alpha_workers_down
make -f Makefile.alpha alpha_workers_up

# Or restart all at once
make -f Makefile.alpha alpha_all_down
make -f Makefile.alpha alpha_infra_up
```

### Full Alpha Environment Setup

For a fresh alpha environment:

```bash
# Create network (first time only)
make -f Makefile.alpha alpha_network_create

# Start infrastructure and initialize databases
make -f Makefile.alpha alpha_setup

# Start application services
make -f Makefile.alpha alpha_api_up
make -f Makefile.alpha alpha_web_up
make -f Makefile.alpha alpha_workers_up
make -f Makefile.alpha alpha_management_api_up
make -f Makefile.alpha alpha_management_web_up
```

## Version Tagging

Docker images are tagged with:

- `X.Y.Z-alpha` - Version-specific tag (e.g., `5.2.0-alpha`)
- `alpha` - Always points to latest alpha build

The version is determined by:

1. `version_override` input (if manually triggered with override)
2. Root `package.json` version with `-alpha` suffix (default)

## Troubleshooting

| Issue                                       | Cause                                  | Solution                                                                                              |
| ------------------------------------------- | -------------------------------------- | ----------------------------------------------------------------------------------------------------- |
| "not possible to fast-forward" error        | `alpha` branch diverged from `develop` | Reset alpha: `git checkout alpha && git reset --hard origin/develop && git push --force origin alpha` |
| Workflow fails at "Security audit"          | npm vulnerabilities found              | Run `./scripts/audit/audit.sh --fix` locally                                                          |
| Workflow fails at "Lint"                    | Linting errors                         | Run `npm run lint` locally to see errors                                                              |
| Workflow fails at "Type check"              | TypeScript errors                      | Run `npm run type-check` locally                                                                      |
| Workflow fails at "Build all apps"          | Build errors                           | Run `npm run build:apps` locally                                                                      |
| Docker build fails                          | Dockerfile or dependency issue         | Build locally with `docker build -f apps/<app>/Dockerfile .`                                          |
| Container fails at start (MODULE_NOT_FOUND) | Workspace package missing from image   | See [Reproducing runtime errors locally](#reproducing-runtime-errors-locally) below                   |
| GHCR push fails                             | Permission issue                       | Verify GITHUB_TOKEN has `packages:write` scope                                                        |
| Version conflict                            | Tag already exists                     | Use `version_override` with a different version                                                       |
| Images not updating on server               | Docker cache                           | Run `docker pull` with `--no-cache` or prune images                                                   |

### Reproducing runtime errors locally

If api or management-api fail on the server with `Cannot find module '@podverse/helpers-config'` (or
similar), reproduce and debug locally:

1. **Build the same images locally** (from repo root):

   ```bash
   make validate_docker
   ```

   This runs `make validate` then builds all five Docker images (api, web, workers, management-api,
   management-web). If the runner stage is missing a workspace package, the image still builds; the
   error appears only when the container starts.

2. **Run the API container** to test startup (replace with your env path or use a minimal env):

   ```bash
   docker run --rm -e NODE_ENV=production \
     -e DATABASE_URL="postgres://user:pass@host:5432/db" \
     podverse-api:test node apps/api/dist/index.js
   ```

   Use the same for management-api: `podverse-management-api:test` and
   `apps/management-api/dist/index.js`. You should see the same `MODULE_NOT_FOUND` if a package is
   missing from the Dockerfile runner stage.

3. **Fix**: Ensure every workspace package the app (and its copied packages) require is copied in the
   Dockerfile’s final stage (see `COPY --from=builder /opt/packages/...`). Rebuild with
   `make validate_docker` and run the container again to confirm.

### Viewing Detailed Logs

```bash
# Get the run ID
gh run list --workflow=publish-alpha.yml --limit 5

# View full logs
gh run view <run-id> --log

# View only failed steps
gh run view <run-id> --log-failed

# Download log artifacts
gh run download <run-id>
```

### Re-running Failed Workflows

```bash
# Re-run all jobs
gh run rerun <run-id>

# Re-run only failed jobs
gh run rerun <run-id> --failed
```

## Related Documentation

- [Branch Protection Rules](BRANCH-PROTECTION.md)
- [Secrets Configuration](modules/SECRETS.md)
- [Quick Start Guide](QUICKSTART.md)
- [Architecture Overview](ARCHITECTURE.md)
