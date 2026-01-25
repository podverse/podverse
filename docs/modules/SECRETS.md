# GitHub Secrets Configuration

This document describes the GitHub Secrets required for the monorepo's CI/CD workflows.

## Required Secrets

| Secret | Used By | Purpose |
|--------|---------|---------|
| `NPM_TOKEN` | publish-alpha.yml | Authenticate with npm for package publishing |
| `GHCR_REGISTRY_TOKEN` | publish-alpha.yml | Query existing Docker image tags |

## Automatic Secrets

| Secret | Provided By | Purpose |
|--------|-------------|---------|
| `GITHUB_TOKEN` | GitHub Actions | GHCR push, PR operations, checkout |

## Setup Instructions

### NPM_TOKEN

Used to publish packages to npm under the `@podverse` scope.

1. Log in to [npmjs.com](https://www.npmjs.com)
2. Go to **Account** → **Access Tokens**
3. Click **Generate New Token** → **Classic Token**
4. Select **Automation** type (for CI/CD)
5. Copy the token
6. In GitHub repo: **Settings** → **Secrets and variables** → **Actions**
7. Click **New repository secret**
8. Name: `NPM_TOKEN`, Value: (paste token)

### GHCR_REGISTRY_TOKEN

Used to query existing Docker image tags in GitHub Container Registry.

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

No secrets required. Runs on all PRs to validate:
- Linting
- Type checking
- Package builds
- App builds

### publish-alpha.yml

**Secrets used**: `NPM_TOKEN`, `GHCR_REGISTRY_TOKEN`, `GITHUB_TOKEN`

Triggers on push to `alpha` branch:
1. Validates build
2. Publishes npm packages to `@alpha` tag
3. Builds and pushes Docker images to GHCR

## Security Notes

- Never commit secrets to the repository
- Rotate tokens periodically
- Use fine-grained permissions where possible
- `GITHUB_TOKEN` is automatically scoped to the repository
