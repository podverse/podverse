# Branch Protection and Required Checks

This document describes merge protection for Podverse.

## Configuration Location

Primary configuration lives in GitHub Rulesets:

- GitHub Repository -> Settings -> Rules -> Rulesets

The active ruleset **`develop-protection`** targets **`develop`**, **`main`**, and **`staging`** and requires
`validate` as a status check, plus PR, code review, and branch safety rules (see table below). The
`staging` branch is the preprod / publish-train trigger.

Do not duplicate the same merge policy under Settings -> Branches. Keep Rulesets
as the single source of truth to avoid conflicting enforcement behavior.

## Ruleset: `develop-protection` (covered branches)

**Include ref patterns:** `refs/heads/develop`, `refs/heads/main`, `refs/heads/staging`

| Setting                               | Value      |
| ------------------------------------- | ---------- |
| Require a pull request before merging | Yes        |
| Required approving reviews            | 1          |
| Dismiss stale pull request approvals  | Yes        |
| Require review from Code Owners       | Yes        |
| Require status checks to pass         | Yes        |
| Required status checks                | `validate` |
| Require branches to be up to date     | Yes        |
| Block deletions / non-FF              | Yes        |
| Allow force pushes                    | No         |
| Allow deletions                       | No         |

Bypass: configured teams/integrations in the ruleset (e.g. for automation that must push to these branches with `--no-verify` only where policy allows).

## Local Enforcement

In addition to GitHub branch protection, local git hooks enforce:

- **pre-push**: Blocks direct pushes to protected branches (main, staging, develop)
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

## Vendor-Specific Note

This guide is GitHub-specific (Rulesets, branch protection, required status
checks). Forks hosted on other git platforms (GitLab, Gitea, Bitbucket, etc.)
must configure equivalent protected-branch and required-pipeline/check policies
using that host's native controls.
