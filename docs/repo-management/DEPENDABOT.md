# Dependabot Configuration

This document explains the automated dependency update system using GitHub Dependabot.

## Overview

Dependabot automatically creates pull requests to keep dependencies up-to-date and secure. Configuration is in [`.github/dependabot.yml`](/.github/dependabot.yml).

## Update Schedule

**Weekly on Mondays at 8:00 AM Central Time**

All dependency checks run on this schedule to batch updates together, reducing noise and review overhead.

## Ecosystem Coverage

### 1. npm Dependencies (Root)

**Directory**: `/` (root `package.json` and workspace packages)

**Grouping Strategy**:

- **production-minor-patch**: Groups all minor and patch production updates (excludes `@types/*`, `eslint*`, `typescript`)
- **typescript-ecosystem**: Groups TypeScript, `@types/*`, and ESLint updates separately
- **dev-dependencies**: Groups all dev dependency minor/patch updates

**Labels**: `dependencies`

**PR Limit**: 10 concurrent PRs

**Node.js LTS (npm)**: `@types/node` updates are limited to LTS (even) versions only; odd
(19.x, 21.x, 23.x, 25.x, 27.x, 29.x, 31.x) are ignored.

### 2. Docker Images

**Directories**:

- `/apps/api`
- `/apps/web`
- `/apps/workers`
- `/apps/management-api`
- `/apps/management-web`

**Labels**: `dependencies`, `docker`

**Node.js LTS Policy**:

- ✅ Only even-numbered versions (18, 20, 22, 24, 26...)
- ❌ Ignores odd-numbered versions (19, 21, 23, 25, 27...)

> **Why?** Node.js follows a predictable release schedule where only even-numbered major versions become LTS (Long Term Support). Odd-numbered versions are "Current" releases that never receive LTS status.

**Ignored Versions**: `19.x`, `21.x`, `23.x`, `25.x`, `27.x`, `29.x`

### 3. GitHub Actions

**Directory**: `/` (`.github/workflows/`)

**Labels**: `dependencies`

**Note**: These PRs also automatically receive the `ci` label from the PR Labeler workflow
since they modify files in `.github/`. Keep `node-version` in workflows on LTS (even:
18, 20, 22, 24, …); Dependabot does not restrict workflow node versions, so set them
manually.

## Labels Explained

| Label          | Applied To                         | Applied By |
| -------------- | ---------------------------------- | ---------- |
| `dependencies` | All Dependabot PRs                 | Dependabot |
| `docker`       | Docker image updates               | Dependabot |
| `ci`           | GitHub Actions updates             | PR Labeler |
| `apps`         | Docker updates (modify `apps/*/`)  | PR Labeler |
| `packages`     | npm updates (modify `packages/*/`) | PR Labeler |

See [GitHub Labels](GITHUB-LABELS.md) for complete label documentation.

## Node.js Version Policy

### Current LTS: Node.js 24

All Docker `FROM node:…` images use **Node.js 24** (see `node:24-slim` and `node:24-alpine` in app Dockerfiles, `node:24-slim` in K8s CronJobs and make targets). Local dev and CI align with root `.nvmrc` (24).

### LTS Release Schedule

| Version | Status      | LTS Start  | LTS End    |
| ------- | ----------- | ---------- | ---------- |
| 18      | Maintenance | 2022-10-25 | 2025-04-30 |
| 20      | Active LTS  | 2023-10-24 | 2026-04-30 |
| 22      | Active LTS  | 2024-10-29 | 2027-04-30 |
| 24      | Active LTS  | 2025-10-28 | 2028-04-30 |
| 26      | Future LTS  | 2026-10-27 | 2029-10-20 |

**Next LTS to plan for**: Node.js 26 (expected Active LTS October 2026; confirm on [Node release schedule](https://github.com/nodejs/Release).)

### Why LTS-Only?

- **Stability**: LTS versions receive long-term security and stability updates
- **Predictability**: 30-month support window for each LTS version
- **Production-ready**: Recommended for all production environments
- **Ecosystem compatibility**: Most packages prioritize LTS compatibility

## Handling Dependabot PRs

### When PRs Are Created

Dependabot creates PRs every Monday morning. You'll typically see:

- 1-3 grouped npm dependency PRs
- 0-5 Docker image PRs (only if new LTS versions available)
- 0-5 GitHub Actions PRs (only if new versions available)

### First-Time Setup

On initial Dependabot setup, you may see a large batch of PRs for all outdated dependencies. This is normal and happens only once.

**To create missing labels**:

```bash
./scripts/github/setup-all-labels.sh
```

### Review Process

1. **Check CI status** - Ensure all checks pass
2. **Review changes** - Look at the CHANGELOG or release notes
3. **Test locally** (for significant updates)
4. **Merge or close**

### Closing Unwanted PRs

Some PRs may not be wanted (e.g., major version bumps requiring migration):

```bash
# Close a single PR
gh pr close <number> --comment "Closing: requires manual migration"

# Close multiple PRs
gh pr close 20 21 22 --comment "Closing: non-LTS Node.js versions"
```

### Triggering Manual Updates

To check for updates outside the schedule:

**Option 1: Via PR comment**

```
@dependabot rebase
```

**Option 2: Via Dependabot Dashboard**

1. Go to: https://github.com/podverse/podverse/network/updates
2. Click "Check for updates" on specific configurations

## Security Updates

Dependabot also creates security advisories for vulnerable dependencies. These appear as:

- Issues in the Security tab
- Pull requests with security labels
- Automated alerts via email/GitHub notifications

Security updates are created **immediately** regardless of the weekly schedule.

## Configuration Changes

When modifying `.github/dependabot.yml`:

1. **Edit the file** - Make your changes
2. **Commit and merge** - Changes take effect immediately
3. **Existing PRs** - Remain open (close manually if no longer wanted)
4. **New PRs** - Created on next scheduled run or manual trigger

## Troubleshooting

### PRs Fail to Get Labels

**Problem**: Dependabot PR missing `dependencies` or `docker` labels

**Solution**: Run the label setup script

```bash
./scripts/github/setup-all-labels.sh
```

### Too Many PRs

**Problem**: Receiving more PRs than desired

**Solutions**:

1. Lower `open-pull-requests-limit` in config (currently 10 for npm)
2. Add more dependencies to `ignore` lists
3. Adjust grouping rules to combine more updates

### Unwanted Version Updates

**Problem**: Dependabot suggesting versions you don't want

**Solution**: Add to `ignore` section in dependabot.yml

```yaml
ignore:
  - dependency-name: 'package-name'
    versions: ['1.x', '2.x']
```

## Related Documentation

- [GitHub Labels](GITHUB-LABELS.md) - Complete label reference
- [Contributing](/docs/development/CONTRIBUTING.md) - PR review guidelines
- [GitHub Actions](/.github/workflows) - CI/CD workflows

## References

- [Dependabot Documentation](https://docs.github.com/en/code-security/dependabot)
- [Node.js Release Schedule](https://github.com/nodejs/release#release-schedule)
- [Semantic Versioning](https://semver.org/)
