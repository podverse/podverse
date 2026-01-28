# Phase 11: Git Workflow

**Status**: Planned

## Overview

Establish branching strategy, PR process, and branch protection rules for the monorepo.

## Branch Strategy

```
main (production)
  ↑
beta (beta release)
  ↑
alpha (alpha release)
  ↑
develop (main development)
  ↑
feature/* | fix/* | chore/*
```

### Branch Descriptions

| Branch      | Purpose             | Deploys To         |
| ----------- | ------------------- | ------------------ |
| `main`      | Production releases | Production servers |
| `beta`      | Beta testing        | Beta servers       |
| `alpha`     | Alpha testing       | Alpha servers      |
| `develop`   | Main development    | (none - CI only)   |
| `feature/*` | New features        | (none - CI only)   |
| `fix/*`     | Bug fixes           | (none - CI only)   |
| `chore/*`   | Maintenance         | (none - CI only)   |

### Branch Naming

```
feature/issue-123-add-podcast-chapters
fix/issue-456-clip-playback-error
chore/update-dependencies
docs/improve-contributing-guide
```

## Commit Message Format

Follow Conventional Commits:

```
<type>(<scope>): <description>

[optional body]

[optional footer(s)]
```

### Types

| Type       | Description                             |
| ---------- | --------------------------------------- |
| `feat`     | New feature                             |
| `fix`      | Bug fix                                 |
| `docs`     | Documentation only                      |
| `style`    | Formatting, no code change              |
| `refactor` | Code change that neither fixes nor adds |
| `perf`     | Performance improvement                 |
| `test`     | Adding tests                            |
| `chore`    | Maintenance tasks                       |
| `ci`       | CI/CD changes                           |

### Examples

```bash
# Feature
feat(web): add podcast chapter navigation

# Bug fix with issue reference
fix(api): resolve clip playback error (#456)

# Breaking change
feat(orm)!: rename Episode.pubDate to publishedAt

BREAKING CHANGE: Episode.pubDate has been renamed to publishedAt.
Update all usages accordingly.
```

## Feature Development Workflow

### 1. Start Work

```bash
# Ensure develop is up to date
git checkout develop
git pull origin develop

# Create feature branch
git checkout -b feature/issue-123-add-podcast-chapters
```

### 2. Make Changes

```bash
# Make commits
git add .
git commit -m "feat(parser): add chapter parsing support"

# Push branch
git push -u origin feature/issue-123-add-podcast-chapters
```

### 3. Create Pull Request

- Target: `develop`
- Title: `feat: add podcast chapter navigation (#123)`
- Description: Use PR template
- Request reviews

### 4. After Approval

- Squash and merge to `develop`
- Delete feature branch

## Release Workflow

### Alpha Release

```bash
# Create PR: develop -> alpha
# Title: "Release: v5.2.1-alpha"
# After approval and merge, GitHub Actions publishes
```

### Beta Release

```bash
# Create PR: alpha -> beta
# Title: "Release: v5.2.1-beta"
# Requires 2 approvals
```

### Production Release

```bash
# Create PR: beta -> main
# Title: "Release: v5.2.1"
# Requires 2 approvals + manual review
```

## Branch Protection Rules

### develop

```yaml
required_pull_request_reviews:
  required_approving_review_count: 1
  dismiss_stale_reviews: true
required_status_checks:
  strict: true
  contexts:
    - 'validate'
restrictions: null
allow_force_pushes: false
allow_deletions: false
```

### alpha

```yaml
required_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
required_status_checks:
  strict: true
  contexts:
    - 'validate'
restrictions:
  users: []
  teams: ['maintainers']
allow_force_pushes: false
```

### beta, main

```yaml
required_pull_request_reviews:
  required_approving_review_count: 2
  dismiss_stale_reviews: true
  require_code_owner_reviews: true
required_status_checks:
  strict: true
  contexts:
    - 'validate'
restrictions:
  users: []
  teams: ['maintainers']
allow_force_pushes: false
require_linear_history: true
```

## Pull Request Template

**File**: `.github/PULL_REQUEST_TEMPLATE.md`

```markdown
## Description

<!-- What does this PR do? -->

## Related Issue

<!-- Link to GitHub issue: Fixes #123 -->

## Type of Change

- [ ] Bug fix (non-breaking change that fixes an issue)
- [ ] New feature (non-breaking change that adds functionality)
- [ ] Breaking change (fix or feature that would cause existing functionality to not work as expected)
- [ ] Documentation update

## Checklist

- [ ] My code follows the project's style guidelines
- [ ] I have performed a self-review of my code
- [ ] I have added tests that prove my fix/feature works
- [ ] I have updated documentation as needed
- [ ] I have updated `.llm/history/active/` if this is LLM-assisted work

## Screenshots (if applicable)

<!-- Add screenshots for UI changes -->

## Additional Notes

<!-- Any additional context -->
```

## Issue Templates

**File**: `.github/ISSUE_TEMPLATE/bug_report.md`

```markdown
---
name: Bug Report
about: Report a bug
labels: bug
---

## Description

<!-- Clear description of the bug -->

## Steps to Reproduce

1. Go to '...'
2. Click on '...'
3. See error

## Expected Behavior

<!-- What should happen -->

## Actual Behavior

<!-- What actually happens -->

## Environment

- OS: [e.g., macOS 14.0]
- Node version: [e.g., 22.0.0]
- Browser (if applicable): [e.g., Chrome 120]

## Additional Context

<!-- Screenshots, logs, etc. -->
```

**File**: `.github/ISSUE_TEMPLATE/feature_request.md`

```markdown
---
name: Feature Request
about: Suggest an idea
labels: enhancement
---

## Problem Statement

<!-- What problem does this solve? -->

## Proposed Solution

<!-- How should it work? -->

## Alternatives Considered

<!-- Other approaches you've considered -->

## Additional Context

<!-- Mockups, examples, etc. -->
```

## CODEOWNERS

**File**: `.github/CODEOWNERS`

```
# Default owners
* @podverse/maintainers

# Package-specific owners
/packages/helpers/ @podverse/core-team
/packages/orm/ @podverse/core-team
/packages/parser/ @podverse/core-team

# App-specific owners
/apps/web/ @podverse/frontend-team
/apps/api/ @podverse/backend-team

# Infrastructure
/infra/ @podverse/devops-team
/.github/ @podverse/devops-team
```

## Git Hooks (Reminder)

Already covered in Phase 1:

- `pre-commit`: Documentation reminder
- `commit-msg`: Issue reference encouragement

## Quick Reference

### Common Commands

```bash
# Start new feature
git checkout develop && git pull
git checkout -b feature/issue-123-description

# Update feature branch with latest develop
git checkout develop && git pull
git checkout feature/issue-123-description
git rebase develop

# Squash commits before PR
git rebase -i HEAD~3  # squash last 3 commits

# Push with force (after rebase)
git push --force-with-lease
```

### PR Merge Strategy

| Target Branch | Merge Method     |
| ------------- | ---------------- |
| `develop`     | Squash and merge |
| `alpha`       | Merge commit     |
| `beta`        | Merge commit     |
| `main`        | Merge commit     |

## Files to Create

| File                                        | Purpose          |
| ------------------------------------------- | ---------------- |
| `.github/PULL_REQUEST_TEMPLATE.md`          | PR template      |
| `.github/ISSUE_TEMPLATE/bug_report.md`      | Bug template     |
| `.github/ISSUE_TEMPLATE/feature_request.md` | Feature template |
| `.github/CODEOWNERS`                        | Code ownership   |

## GitHub Settings to Configure

1. Branch protection rules (via GitHub UI or API)
2. Required status checks
3. Merge button settings (squash for develop)

## Estimated Effort

~2-3 hours (including GitHub configuration)
