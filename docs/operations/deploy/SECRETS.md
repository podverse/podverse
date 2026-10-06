# GitHub Secrets Configuration

This document describes the GitHub Secrets required for the monorepo's CI/CD workflows.

## Required Secrets

| Secret                | Used By                                   | Purpose                                                                     |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `GHCR_REGISTRY_TOKEN` | `publish-staging.yml`, `publish-main.yml` | Preferred token for querying GHCR tags during staging smart-start / promote |

## Automatic Secrets

| Secret         | Provided By    | Purpose                            |
| -------------- | -------------- | ---------------------------------- |
| `GITHUB_TOKEN` | GitHub Actions | GHCR push, PR operations, checkout |

## Setup Instructions

### GHCR_REGISTRY_TOKEN

Used to query existing Docker image tags in GitHub Container Registry to assist smart-start
behavior for the **`staging`** branch’s `X.Y.Z-staging.N` line (e.g., `5.2.0-staging.0`, `5.2.0-staging.1`, etc.), and to list tags during the **`main`** promote flow.
`publish-staging.yml` and `publish-main.yml` fall back to `GITHUB_TOKEN` for tag listing when needed; **staging** version **reservation**
is via the Git ref API, not from GHCR alone.

1. Go to GitHub **Settings** → **Developer settings** → **Personal access tokens** → **Fine-grained tokens**
2. Click **Generate new token**
3. Set expiration and name (e.g., "podverse-ghcr-read")
4. Under **Repository access**, select the podverse repository
5. Under **Permissions** → **Packages**, select **Read**
6. Generate and copy the token
7. In GitHub repo: **Settings** → **Secrets and variables** → **Actions**
8. Click **New repository secret**
9. Name: `GHCR_REGISTRY_TOKEN`, Value: (paste token)

## Workflow Reference

### ci.yml

No secrets required. Runs on `/test` comment to validate:

- Database migrations synced
- Linting
- Type checking
- Package builds
- App builds

### publish-staging.yml

**Secrets used**: `GHCR_REGISTRY_TOKEN`, `GITHUB_TOKEN` (automatic)

Triggers on push to the `staging` branch or manual `workflow_dispatch`:

1. Validates build (lint, type-check, security audit)
2. Reserves the next immutable tag (e.g. `5.2.0-staging.3`) via the GitHub Git Refs API; may list GHCR for smart-start hints
   - First-run `404` (package not created yet) is normal; bootstrap is handled by the workflow
   - `401/403` on listing indicates auth/permission issues and can fail the job
3. Builds Docker images from source (packages included in build context)
4. Pushes Docker images to GHCR with the version tag and floating **`staging`**
5. Creates a prerelease GitHub Release when applicable

**Note**: npm packages are NOT published to npm registry. Docker images contain packages built from source.

### publish-main.yml

**Secrets used**: `GHCR_REGISTRY_TOKEN` (to list staging tags; optional but recommended), `GITHUB_TOKEN` (crane copy, tag, release)

Triggers on push to `main` (or `workflow_dispatch`): promotes existing `X.Y.Z-staging.N` images to `X.Y.Z` and `:latest`, then creates the `X.Y.Z` Git tag and a non-prerelease release. Does not build app images in this workflow.

### i18n.yml

**Secrets used**: none (`GITHUB_TOKEN` for checkout only)

Triggers on pull requests that touch `packages/i18n-catalog`. Runs `npm run i18n:validate`.
Does not generate translations or push commits.

## Security Notes

- Never commit secrets to the repository
- Rotate tokens periodically
- Use fine-grained permissions where possible
- `GITHUB_TOKEN` is automatically scoped to the repository
