# GitHub Secrets Configuration

This document describes the GitHub Secrets required for the monorepo's CI/CD workflows.

## Required Secrets

| Secret                | Used By                                   | Purpose                                                                     |
| --------------------- | ----------------------------------------- | --------------------------------------------------------------------------- |
| `GHCR_REGISTRY_TOKEN` | `publish-staging.yml`, `publish-main.yml` | Preferred token for querying GHCR tags during staging smart-start / promote |
| `OPENAI_API_KEY`      | i18n.yml                                  | Auto-generate translations after merge to develop                           |
| `APP_ID`              | complete-feature.yml, i18n.yml            | GitHub App authentication for protected branch pushes                       |
| `APP_PRIVATE_KEY`     | complete-feature.yml, i18n.yml            | GitHub App authentication for protected branch pushes                       |

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

### OPENAI_API_KEY

Used for automated LLM-powered translations when PRs are merged to `develop`. The `i18n.yml` workflow uses this to generate translations for non-English locales.

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

See [i18n documentation](../localization/I18N.md) for full i18n documentation.

### APP_ID and APP_PRIVATE_KEY

Used by GitHub App for pushing to protected branches (e.g., automated commits to `develop`).

**Creating a GitHub App:**

1. Go to GitHub **Settings** → **Developer settings** → **GitHub Apps**
2. Click **New GitHub App**
3. Name: `podverse-automation` (or similar)
4. Homepage URL: Repository URL
5. Uncheck **Webhook** > **Active** (not needed)
6. Permissions:
   - **Repository permissions** → **Contents**: Read and write
   - **Repository permissions** → **Pull requests**: Read and write
7. Click **Create GitHub App**
8. Note the **App ID** (shown on app page)
9. Scroll to **Private keys** → **Generate a private key**
10. Download the `.pem` file

**Adding secrets:**

1. In GitHub repo: **Settings** → **Secrets and variables** → **Actions**
2. Add `APP_ID` with the App ID value
3. Add `APP_PRIVATE_KEY` with the entire contents of the `.pem` file

**Installing the App:**

1. On the GitHub App page, click **Install App**
2. Select the podverse organization
3. Choose **Only select repositories** → select `podverse`
4. Click **Install**

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
5. Creates a prerelease GitHub Release and opens the changelog PR to `develop` when applicable

**Note**: npm packages are NOT published to npm registry. Docker images contain packages built from source.

### publish-main.yml

**Secrets used**: `GHCR_REGISTRY_TOKEN` (to list staging tags; optional but recommended), `GITHUB_TOKEN` (crane copy, tag, release)

Triggers on push to `main` (or `workflow_dispatch`): promotes existing `X.Y.Z-staging.N` images to `X.Y.Z` and `:prod`, then creates the Git tag and a non-prerelease release. Does not build app images in this workflow.

### i18n.yml

**Secrets used**: `OPENAI_API_KEY`, `APP_ID`, `APP_PRIVATE_KEY`, `GITHUB_TOKEN`

Triggers on push to `develop` when `en-US.json` files change:

1. Runs LLM translations for all non-English locales
2. Compiles translation files
3. Commits and pushes generated translations to `develop`

### complete-feature.yml

**Secrets used**: `APP_ID`, `APP_PRIVATE_KEY`, `GITHUB_TOKEN`

Triggers when PR is merged to `develop`:

1. Moves LLM history from `active/` to `completed/`
2. Commits changes to `develop` branch

## Security Notes

- Never commit secrets to the repository
- Rotate tokens periodically
- Use fine-grained permissions where possible
- `GITHUB_TOKEN` is automatically scoped to the repository
- GitHub App tokens are short-lived and automatically expire
