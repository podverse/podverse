# Alpha Deployment Guide

This document describes how to deploy to the alpha environment for testing.

For remote Kubernetes + Argo CD deployments with a separate GitOps repository, use
[REMOTE-K8S-GITOPS](../development/REMOTE-K8S-GITOPS.md). This guide focuses on image
publish and local/server alpha workflows from this repository.

## Overview

The alpha environment is a pre-production testing environment. Docker images are built and pushed to GitHub Container Registry (GHCR) when:

1. Changes are pushed to the **`staging`** branch (or the build workflow is manually triggered)
2. For production, pushes to **`main`** run a **separate** promote-only workflow (no app rebuild; see [PUBLISH](PUBLISH.md))

**Important:** The **`staging`** and **`main`** branches are **promotion / trigger** branches. Do **not** land feature work on them. Work happens on `develop` (or feature branches merged to `develop`); you **fast-forward** a promotion branch to the commit you want to build or ship.

### Release train (staging preprod → main RTM) and changelogs

- **Base version** `X.Y.Z` in the repo root and workspace `package.json` files: you set this when you choose, using `./scripts/publish/bump-version.sh` on `develop` (it does not create a Git tag).
- **Build version** (what is pushed to GHCR, what matches the **Git** tag, and the **prerelease GitHub Release** name on **staging** builds) is chosen in CI: **`X.Y.Z-staging.N`** (N reserved atomically via Git tag; see [PUBLISH](PUBLISH.md)), plus floating image tag **`:staging`**.
- **`main` (production):** a dedicated workflow **promotes** the existing `X.Y.Z-staging.N` line to immutable **`X.Y.Z`** and **`:latest`**; it then creates the **`X.Y.Z` Git tag** and a **full** (non-prerelease) **GitHub Release** from [`docs/development/CHANGELOGS/X.Y.Z.md`](../development/CHANGELOGS/) on the promote commit, and moves **refs/tags/latest** to the promote commit. It does not rebuild app images in that run.
- **Staging** prerelease releases and **main** production releases both use the same base semver changelog file `docs/development/CHANGELOGS/X.Y.Z.md`.
- Bump the version on **`develop`** at the start of work using `./scripts/publish/bump-version.sh`; this creates the `X.Y.Z.md` changelog file so release notes can be updated continuously as changes land.

Promotion: `./scripts/publish/sync-develop-to-staging.sh` (preprod), then when ready for RTM `./scripts/publish/sync-staging-to-main.sh` (do not sync `develop` directly to `main`).

- **Build + push to GHCR:** [`.github/workflows/publish-staging.yml`](../.github/workflows/publish-staging.yml) — display name **“Publish (staging)”**, on pushes to **`staging`** (or `workflow_dispatch`).
- **Promote to RTM:** [`.github/workflows/publish-main.yml`](../.github/workflows/publish-main.yml) — **“Publish (main)”**, on pushes to **`main`**.

```mermaid
flowchart TD
    subgraph trigger [Trigger Options]
        A[Push to staging branch]
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
- Ability to push to the **`staging`** branch (bypass branch protection if enabled) for preprod builds

### Required Secrets (Already Configured)

See [Secrets Configuration](SECRETS.md) for details:

- `GHCR_REGISTRY_TOKEN` - Recommended for GHCR tag discovery (`packages:read`)
- `GITHUB_TOKEN` - Automatic, used for GHCR push

If `GHCR_REGISTRY_TOKEN` is unavailable or fails with auth errors, the workflow retries tag
discovery with `GITHUB_TOKEN`.

### Local Tools (Optional, for CLI workflows)

```bash
# GitHub CLI for workflow management
brew install gh
gh auth login

# Docker for local build testing
brew install --cask docker
```

## Testing Locally (Before Pushing)

Before triggering the **staging** build workflow, validate your changes locally.

### Quick Validation (Recommended)

```bash
# Run all CI checks with a single command
make validate
```

This runs: security audit, build packages, lint, type-check, local env setup, and build apps.

### Full Validation with Docker

```bash
# Run all CI checks AND build all Docker images locally
make validate_docker
```

This is the most thorough test; if this passes, the **staging** publish workflow should succeed. It builds the same images as CI: base images (web-base, management-web-base), then api, web-deploy, web-runtime-config, workers, management-api, management-web-deploy, and management-web-runtime-config.

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
npm run build:packages
npm run lint
npm run type-check
npm run build:apps

# 4. Test Docker builds locally (optional but recommended)
# For full parity with CI, use: make validate_docker
# It builds base images first, then all app and runtime-config images.
docker build -f apps/api/Dockerfile -t podverse-api:test .
# Web and management-web require base images; use make validate_docker to build everything.
docker build -f apps/workers/Dockerfile -t podverse-workers:test .
docker build -f apps/management-api/Dockerfile -t podverse-management-api:test .
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

### Step 2: Fast-forward `staging` from `develop`

The **`staging`** branch should be a fast-forward of `develop` when you want a new preprod build.

**Recommended: use the helper script** (validates state and ensures safety):

```bash
./scripts/publish/sync-develop-to-staging.sh
```

The script will:

- Check for uncommitted changes (prevents unexpected results)
- Verify that `staging` can fast-forward merge from `develop`
- Ensure `staging` is a perfect mirror of `develop`
- Perform the merge and push automatically

**Note:** The script uses `--no-verify` to bypass git hooks when pushing, similar to `bump-version.sh`. To push to the protected `staging` branch, your GitHub user must have "Allow specified actors to bypass required pull requests" permission configured in the repository's branch protection rules. If you don't have this permission, the script will provide guidance on creating a PR instead.

**Manual method** (if you prefer to do it manually):

```bash
# Fast-forward merge develop into staging
git checkout staging
git merge develop --ff-only
git push --no-verify origin staging
```

**Note:** The manual method also requires bypass permissions for the protected `staging` branch. If you don't have permissions, create a Pull Request from `develop` to `staging` instead.

### Step 3: Fast-forward `main` from `staging` (RTM, production promote)

When **Publish (staging)** has **succeeded** and you are ready to ship that same line to production, advance **`main`** to match **`staging`** (not `develop`):

**Recommended: use the helper script:**

```bash
./scripts/publish/sync-staging-to-main.sh
```

The script:

- Verifies a fast-forward of **`main` from `staging`** (both branches are mirrors with no long-lived feature commits; **main lags** staging in the same train)
- Runs the same npm **audit** gate on the **staging** tree before pushing
- Pushes **`main`**, which triggers **Publish (main)** (crane promote to **`X.Y.Z` / `:latest`**, no rebuild)

If you do not have bypass permissions for `main`, use a **Pull Request** from `staging` to `main` instead. Do **not** use the removed **`develop` → `main`** one-hop sync; the promote workflow expects images to exist from the **staging** pipeline for the `X.Y.Z` base in `package.json` on the **`main` push** commit, which is aligned with **`staging`**.

**Manual method:**

```bash
git checkout main
git pull origin main
git merge staging --ff-only
git push --no-verify origin main
```

### Step 4: Monitor the workflow(s)

```bash
# Watch the workflow run
gh run watch

# Or list recent staging build runs
gh run list --workflow=publish-staging.yml

# View specific run logs
gh run view <run-id> --log
```

## Manual Trigger (Emergency/Testing)

### Via GitHub UI

1. Go to **Actions** > **Publish (staging)**
2. Click **Run workflow** dropdown
3. Optionally enter a version override (e.g., `5.2.1-staging.99` for the staging line)
4. Click **Run workflow**

### Via CLI

```bash
# Trigger with default version (from package.json on the target ref)
gh workflow run publish-staging.yml

# Trigger with custom version (staging line)
gh workflow run publish-staging.yml -f version_override=5.2.1-staging.99

# Watch the triggered run
gh run watch
```

## Verifying the Deployment

### Check Workflow Status

```bash
# List recent workflow runs
gh run list --workflow=publish-staging.yml

# View detailed logs for a run
gh run view <run-id> --log

# View failed job logs only
gh run view <run-id> --log-failed
```

### Verify Docker Images

Note: web app images are published as `web-deploy` and `management-web-deploy` (Next.js requires env at build time). Runtime config is in separate sidecar images.

```bash
# Pull and verify images exist (floating :staging = latest from the staging branch pipeline)
docker pull ghcr.io/podverse/podverse/web-base:staging
docker pull ghcr.io/podverse/podverse/management-web-base:staging
docker pull ghcr.io/podverse/podverse/api:staging
docker pull ghcr.io/podverse/podverse/web-deploy:staging
docker pull ghcr.io/podverse/podverse/web-runtime-config:staging
docker pull ghcr.io/podverse/podverse/workers:staging
docker pull ghcr.io/podverse/podverse/management-api:staging
docker pull ghcr.io/podverse/podverse/management-web-deploy:staging
docker pull ghcr.io/podverse/podverse/management-web-runtime-config:staging

# Check image tags via GitHub API
gh api /orgs/podverse/packages/container/podverse%2Fapi/versions --jq '.[0:3]'
```

## Deploying to Alpha Server

Once images are published to GHCR, deploy them to the alpha server:

### Using Makefile (Recommended)

```bash
# Pull latest images and restart services
make alpha_api_down
make alpha_api_up

make alpha_web_down
make alpha_web_up

make alpha_workers_down
make alpha_workers_pull

# Or restart all at once
make alpha_all_down
make alpha_infra_up
```

### Full Alpha Environment Setup

For a fresh alpha environment (run from repo root; alpha targets are included in the root Makefile):

```bash
# Create network (first time only)
make alpha_network_create

# Start infrastructure and initialize databases
make alpha_setup

# Start application services
make alpha_api_up
make alpha_web_up
make alpha_workers_up
make alpha_management_api_up
make alpha_management_web_up
```

## Version Tagging

Docker images are tagged with:

- `X.Y.Z-staging.N` (from the **`staging`** branch **Publish (staging)** workflow) — immutable, version-specific tag; **`X.Y.Z`** / **`:latest`** after **Publish (main)** on **`main`**
- A **floating** GHCR tag: **`staging`** (latest preprod build) or **`latest`** (after promote); **Git** also has moving lightweight tags **refs/tags/staging** and **refs/tags/latest** (see [PUBLISH](PUBLISH.md))

A **matching Git tag** (same string as the immutable image tag) is created on the publish commit by the `reserve-version` job if it does not already exist; it is **not** reused if it would point to a different commit (the workflow fails instead).

The version is determined by:

1. `version_override` input (if manually triggered with override) on the **staging** workflow
2. Otherwise on **staging**: base version from root `package.json` with an incremented prerelease `N` reserved via the Git ref API (see [PUBLISH](PUBLISH.md))
3. On **main** promote: the same **`X.Y.Z` base** in `package.json` on the push; images are **copied** from the chosen `X.Y.Z-staging.M` line, not built fresh in that workflow

For first-ever publish when GHCR has no package path yet, `404` from tag listing can be part of
an expected bootstrap; the `reserve-version` job starts the staging line at **`X.Y.Z-staging.0`**.

## Troubleshooting

| Issue                                                  | Cause                                                                   | Solution                                                                                                                                                                                              |
| ------------------------------------------------------ | ----------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| "not possible to fast-forward" (develop → `staging`)   | `staging` diverged from `develop`                                       | With team agreement: e.g. `git checkout staging && git reset --hard origin/develop && git push --force origin staging`                                                                                |
| "not possible to fast-forward" (`main` from `staging`) | `main` and `staging` not linear (e.g. old direct `main` from `develop`) | Align with process: `main` should only get **`staging`**. With team agreement, reset or merge as needed, then re-run `sync-staging-to-main.sh` when `main` is a strict fast-forward behind `staging`. |
| Workflow fails at "Security audit"                     | npm vulnerabilities found                                               | Run `./scripts/audit/audit.sh --fix` locally                                                                                                                                                          |
| Workflow fails at "Lint"                               | Linting errors                                                          | Run `npm run lint` locally to see errors                                                                                                                                                              |
| Workflow fails at "Type check"                         | TypeScript errors                                                       | Run `npm run type-check` locally                                                                                                                                                                      |
| Workflow fails at "Build all apps"                     | Build errors                                                            | Run `npm run build:apps` locally                                                                                                                                                                      |
| Docker build fails                                     | Dockerfile or dependency issue                                          | Build locally with `docker build -f apps/<app>/Dockerfile .`                                                                                                                                          |
| Container fails at start (MODULE_NOT_FOUND)            | Workspace package missing from image                                    | See [Reproducing runtime errors locally](#reproducing-runtime-errors-locally) below                                                                                                                   |
| GHCR push fails                                        | Permission issue                                                        | Verify GITHUB_TOKEN has `packages:write` scope                                                                                                                                                        |
| GHCR tag discovery returns 401/403                     | Token scope or org policy restriction                                   | Ensure GHCR_REGISTRY_TOKEN has `packages:read` and org secret visibility includes this repository                                                                                                     |
| GHCR tag discovery returns 404                         | First publish, package path not created                                 | Expected bootstrap case; reserve-version can start the staging line at `X.Y.Z-staging.0`                                                                                                              |
| Version conflict                                       | Tag already exists                                                      | Use `version_override` with a different version                                                                                                                                                       |
| Images not updating on server                          | Docker cache                                                            | Run `docker pull` with `--no-cache` or prune images                                                                                                                                                   |

### Reproducing runtime errors locally

If api or management-api fail on the server with `Cannot find module '@podverse/helpers-config'` (or
similar), reproduce and debug locally:

1. **Build the same images locally** (from repo root):

   ```bash
   make validate_docker
   ```

   This runs `make validate` then builds all Docker images (base images, api, web-deploy,
   web-runtime-config, workers, management-api, management-web-deploy, management-web-runtime-config).
   If the runner stage is missing a workspace package, the image still builds; the error appears only
   when the container starts.

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
gh run list --workflow=publish-staging.yml --limit 5

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

- [Publish: branch → semver → floating tag](PUBLISH.md)
- [Remote Kubernetes (GitOps)](../development/REMOTE-K8S-GITOPS.md)
- [Branch Protection Rules](../repo-management/BRANCH-PROTECTION.md)
- [Secrets Configuration](SECRETS.md)
- [Quick Start Guide](../QUICKSTART.md)
- [Architecture Overview](../architecture/ARCHITECTURE.md)
