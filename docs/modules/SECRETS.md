# GitHub Secrets Configuration

This document describes the GitHub Secrets required for the monorepo's CI/CD workflows.

## Required Secrets

| Secret | Used By | Purpose |
|--------|---------|---------|
| `NPM_TOKEN` | publish-alpha.yml | Authenticate with npm for package publishing |
| `GHCR_REGISTRY_TOKEN` | publish-alpha.yml | Query existing Docker image tags |
| `OPENAI_API_KEY` | i18n-translate.yml | Auto-generate translations after merge to develop |

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

### OPENAI_API_KEY

Used for automated LLM-powered translations when PRs are merged to `develop`. The `i18n-translate.yml` workflow uses this to generate translations for non-English locales.

**For GitHub Actions:**

1. Log in to [platform.openai.com](https://platform.openai.com)
2. Go to **API keys** → **Create new secret key**
3. Copy the key (starts with `sk-`)
4. In GitHub repo: **Settings** → **Secrets and variables** → **Actions**
5. Click **New repository secret**
6. Name: `OPENAI_API_KEY`, Value: (paste key)

**For local development:**

```bash
cp .env.openai.example .env.openai
# Edit .env.openai and add your API key
```

See [docs/i18n.md](../i18n.md) for full i18n documentation.

## Workflow Reference

### ci.yml

No secrets required. Runs on `/test` comment to validate:
- Linting
- Type checking
- i18n file validation
- Package builds
- App builds

**Note**: i18n validation checks file structure only. LLM translations require `OPENAI_API_KEY` (run locally or in separate workflow).

### publish-alpha.yml

**Secrets used**: `NPM_TOKEN`, `GHCR_REGISTRY_TOKEN`, `GITHUB_TOKEN`

Triggers on push to `alpha` branch:
1. Validates build
2. Publishes npm packages to `@alpha` tag
3. Builds and pushes Docker images to GHCR

### i18n-translate.yml

**Secrets used**: `OPENAI_API_KEY`, `GITHUB_TOKEN`

Triggers on push to `develop` when `en-US.json` files change:
1. Runs LLM translations for all non-English locales
2. Compiles translation files
3. Commits and pushes generated translations to `develop`

## Security Notes

- Never commit secrets to the repository
- Rotate tokens periodically
- Use fine-grained permissions where possible
- `GITHUB_TOKEN` is automatically scoped to the repository
