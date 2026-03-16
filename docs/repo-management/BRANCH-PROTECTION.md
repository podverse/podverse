# Branch Protection Rules

This document describes the branch protection rules that should be configured in GitHub.

## Configuration Location

GitHub Repository > Settings > Branches > Add branch protection rule

## Branch: `develop`

**Pattern**: `develop`

| Setting                               | Value      |
| ------------------------------------- | ---------- |
| Require a pull request before merging | Yes        |
| Required approving reviews            | 1          |
| Dismiss stale pull request approvals  | Yes        |
| Require status checks to pass         | Yes        |
| Required status checks                | `validate` |
| Require branches to be up to date     | Yes        |
| Allow force pushes                    | No         |
| Allow deletions                       | No         |

## Branch: `alpha`

**Pattern**: `alpha`

| Setting                               | Value                 |
| ------------------------------------- | --------------------- |
| Require a pull request before merging | Yes                   |
| Required approving reviews            | 2                     |
| Dismiss stale pull request approvals  | Yes                   |
| Require status checks to pass         | Yes                   |
| Required status checks                | `validate`            |
| Require branches to be up to date     | Yes                   |
| Restrict who can push                 | @podverse/maintainers |
| Allow force pushes                    | No                    |
| Allow deletions                       | No                    |

## Branch: `beta`

**Pattern**: `beta`

| Setting                               | Value                 |
| ------------------------------------- | --------------------- |
| Require a pull request before merging | Yes                   |
| Required approving reviews            | 2                     |
| Dismiss stale pull request approvals  | Yes                   |
| Require review from Code Owners       | Yes                   |
| Require status checks to pass         | Yes                   |
| Required status checks                | `validate`            |
| Require branches to be up to date     | Yes                   |
| Restrict who can push                 | @podverse/maintainers |
| Require linear history                | Yes                   |
| Allow force pushes                    | No                    |
| Allow deletions                       | No                    |

## Branch: `main`

**Pattern**: `main`

| Setting                               | Value                 |
| ------------------------------------- | --------------------- |
| Require a pull request before merging | Yes                   |
| Required approving reviews            | 2                     |
| Dismiss stale pull request approvals  | Yes                   |
| Require review from Code Owners       | Yes                   |
| Require status checks to pass         | Yes                   |
| Required status checks                | `validate`            |
| Require branches to be up to date     | Yes                   |
| Restrict who can push                 | @podverse/maintainers |
| Require linear history                | Yes                   |
| Allow force pushes                    | No                    |
| Allow deletions                       | No                    |

## Local Enforcement

In addition to GitHub branch protection, local git hooks enforce:

- **pre-push**: Blocks direct pushes to protected branches (main, beta, alpha, develop)
- **pre-push**: Validates branch naming conventions (feature/_, fix/_, chore/_, docs/_, hotfix/_, release/_)

Commit message template (`.gitmessage`) suggests optional GitHub issue references (#123). See `scripts/git-hooks/` for implementation details.

## Required Status Checks

The `validate` job is defined in `.github/workflows/ci.yml` and runs:

1. Lint (`npm run lint`)
2. Type check (`npm run type-check`)
3. Build packages (`npm run build:packages`)
4. Build apps (`npm run build:apps`)

All checks must pass before a PR can be merged.

## Comment-Triggered CI

To prevent abuse of GitHub Actions by spam PRs, CI does not run automatically on PRs from external contributors.

**Workflow:**

1. External contributor opens PR
2. Maintainer reviews code for obvious issues or malicious content
3. Maintainer comments `/test` on the PR to trigger CI
4. CI runs and posts results as a comment
5. If CI passes, maintainer can approve the PR

**Who can trigger CI:**

- Repository owners
- Organization members
- Collaborators with write access

The workflow adds a 🚀 reaction to the `/test` comment to confirm CI has started.
