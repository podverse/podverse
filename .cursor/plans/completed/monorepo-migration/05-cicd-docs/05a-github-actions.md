# Phase 5A: GitHub Actions CI Workflows

**Status**: Planned
**Effort**: ~3-4 hours
**Dependencies**: None (can run parallel with 5B)

## Overview

Create the CI workflow for PR validation. The publish-alpha.yml workflow is detailed in Phase 8 and will be implemented there.

## Tasks

### 1. Create CI Workflow

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

      - name: Build packages
        run: npm run build:packages

      - name: Build apps
        run: npm run build:apps
```

### 2. Document GitHub Secrets

**File**: `docs/modules/SECRETS.md`

Document required secrets for all workflows:

| Secret | Used By | Purpose |
|--------|---------|---------|
| `NPM_TOKEN` | publish-alpha.yml | npm package publishing |
| `ANTHROPIC_API_KEY` | pr-auto-complete.yml | LLM history generation |
| `GHCR_REGISTRY_TOKEN` | publish-alpha.yml | Query existing Docker tags |
| `GITHUB_TOKEN` | (automatic) | GHCR push, PR operations |

Include setup instructions for each secret.

### 3. Verify Existing Workflows

The following workflows already exist and should be verified:

- `.github/workflows/pr-auto-complete.yml` - Auto-completes LLM history on PR approval
- `.github/workflows/pr-completion-check.yml` - Checks history completion status

### 4. Test Workflow

Options:
- Create a test PR to trigger the workflow
- Use `act` locally to simulate GitHub Actions

## Checklist

- [ ] Create `.github/workflows/ci.yml`
- [ ] Create `docs/modules/SECRETS.md`
- [ ] Verify pr-auto-complete.yml works correctly
- [ ] Verify pr-completion-check.yml works correctly
- [ ] Test CI workflow via PR

## Notes

- publish-alpha.yml is fully specified in Phase 8 (08-versioning-publishing.md)
- Jenkins pipelines were already migrated in Phase 4D
- CI workflow runs on all PRs; publish workflow runs on alpha branch push
