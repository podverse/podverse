# Phase 12: Dependency Management

**Status**: Completed

## Overview

Set up automated dependency updates using Renovate for security patches and version maintenance.

## Why Renovate over Dependabot?

| Feature          | Renovate            | Dependabot       |
| ---------------- | ------------------- | ---------------- |
| Monorepo support | Excellent           | Limited          |
| Grouping updates | Flexible            | Basic            |
| Scheduling       | Highly configurable | Limited          |
| Auto-merge       | Configurable        | Requires Actions |
| Custom rules     | Extensive           | Limited          |
| npm workspaces   | Native support      | Partial          |

## Renovate Configuration

**File**: `renovate.json`

```json
{
  "$schema": "https://docs.renovatebot.com/renovate-schema.json",
  "extends": ["config:base", ":semanticCommits", ":preserveSemverRanges"],

  "labels": ["dependencies"],
  "assignees": ["mitchelldowney"],

  "schedule": ["before 8am on monday"],
  "timezone": "America/Chicago",

  "prConcurrentLimit": 5,
  "prHourlyLimit": 2,

  "packageRules": [
    {
      "description": "Group all non-major dependencies",
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["minor", "patch"],
      "groupName": "all-non-major",
      "groupSlug": "all-minor-patch"
    },
    {
      "description": "Group dev dependencies",
      "matchDepTypes": ["devDependencies"],
      "groupName": "dev-dependencies",
      "groupSlug": "dev-deps"
    },
    {
      "description": "Group TypeScript-related",
      "matchPackagePatterns": ["^@types/", "^typescript"],
      "groupName": "typescript",
      "groupSlug": "typescript"
    },
    {
      "description": "Group ESLint-related",
      "matchPackagePatterns": ["eslint"],
      "groupName": "eslint",
      "groupSlug": "eslint"
    },
    {
      "description": "Group Next.js-related",
      "matchPackagePatterns": ["^next", "^@next/"],
      "groupName": "nextjs",
      "groupSlug": "nextjs"
    },
    {
      "description": "Auto-merge patch updates",
      "matchUpdateTypes": ["patch"],
      "matchCurrentVersion": "!/^0/",
      "automerge": true,
      "automergeType": "pr",
      "automergeStrategy": "squash"
    },
    {
      "description": "Major updates require manual review",
      "matchUpdateTypes": ["major"],
      "dependencyDashboardApproval": true,
      "labels": ["dependencies", "major"]
    },
    {
      "description": "Security updates - high priority",
      "matchPackagePatterns": ["*"],
      "matchUpdateTypes": ["patch", "minor"],
      "vulnerabilityAlerts": true,
      "schedule": ["at any time"],
      "prPriority": 10
    }
  ],

  "vulnerabilityAlerts": {
    "labels": ["security"],
    "schedule": ["at any time"]
  },

  "lockFileMaintenance": {
    "enabled": true,
    "schedule": ["before 5am on the first day of the month"]
  },

  "ignoreDeps": ["podverse-partytime"]
}
```

## Alternative: Dependabot

If preferring GitHub-native solution:

**File**: `.github/dependabot.yml`

```yaml
version: 2

registries:
  npm-registry:
    type: npm-registry
    url: https://registry.npmjs.org

updates:
  # Root package.json
  - package-ecosystem: 'npm'
    directory: '/'
    schedule:
      interval: 'weekly'
      day: 'monday'
      time: '08:00'
      timezone: 'America/Chicago'
    open-pull-requests-limit: 5
    labels:
      - 'dependencies'
    commit-message:
      prefix: 'chore(deps)'
    groups:
      production-dependencies:
        patterns:
          - '*'
        exclude-patterns:
          - '@types/*'
          - 'eslint*'
          - 'typescript'
        update-types:
          - 'minor'
          - 'patch'
      development-dependencies:
        dependency-type: 'development'
        update-types:
          - 'minor'
          - 'patch'

  # Docker images
  - package-ecosystem: 'docker'
    directory: '/apps/api'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
      - 'docker'

  - package-ecosystem: 'docker'
    directory: '/apps/web'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
      - 'docker'

  # GitHub Actions
  - package-ecosystem: 'github-actions'
    directory: '/'
    schedule:
      interval: 'weekly'
    labels:
      - 'dependencies'
      - 'github-actions'
```

## Dependency Update Workflow

### Automated (Renovate)

1. Renovate creates PR on Monday morning
2. CI runs (lint, type-check, build, test)
3. If all pass and patch update: auto-merge
4. If major update: requires manual approval

### Manual Review Required

- Major version updates
- Updates to core dependencies:
  - TypeScript
  - Next.js
  - Express
  - TypeORM

### Security Patches

- Created immediately regardless of schedule
- Higher priority in PR queue
- Labeled `security` for visibility

## Audit Script

**File**: `scripts/audit/audit-all.sh`

```bash
#!/bin/bash
# Check for vulnerabilities in all packages

set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "=== Podverse Dependency Audit ==="
echo ""

# Run npm audit
echo "Running npm audit..."
npm audit --omit=dev || true

echo ""
echo "=== Audit Complete ==="

# Summary
VULNS=$(npm audit --json 2> /dev/null | jq '.metadata.vulnerabilities.total' || echo "0")
if [ "$VULNS" != "0" ] && [ "$VULNS" != "null" ]; then
  echo ""
  echo "⚠️  Found $VULNS vulnerabilities"
  echo "Run 'npm audit fix' to attempt automatic fixes"
  exit 1
else
  echo "✓ No vulnerabilities found"
fi
```

## Pre-Publish Audit

Integrate into publish workflow:

```yaml
# In .github/workflows/publish-alpha.yml
jobs:
  validate:
    steps:
      - name: Security audit
        run: npm audit --audit-level=high
```

## Dependency Pinning Strategy

### Production Dependencies

- Use exact versions for critical packages
- Allow minor/patch ranges for others

```json
{
  "dependencies": {
    "next": "15.0.0", // Exact - major framework
    "express": "^5.0.0", // Minor allowed
    "lodash": "^4.17.21" // Patch allowed
  }
}
```

### Dev Dependencies

- Allow minor updates
- Auto-merge patches

```json
{
  "devDependencies": {
    "typescript": "^5.0.0",
    "@types/node": "^22.0.0",
    "eslint": "^9.0.0"
  }
}
```

## Lock File Maintenance

- Monthly lock file refresh (Renovate)
- Ensures transitive dependencies are updated
- Catches indirect security issues

## Monitoring

### Dependency Dashboard (Renovate)

Renovate creates an issue titled "Dependency Dashboard" that shows:

- Pending updates
- Awaiting approval
- Rate-limited PRs
- Ignored updates

### GitHub Security Tab

- Enable Dependabot alerts (even if using Renovate)
- Provides vulnerability notifications
- Code scanning integration

## Files to Create

| File                         | Purpose                             |
| ---------------------------- | ----------------------------------- |
| `renovate.json`              | Renovate configuration              |
| `.github/dependabot.yml`     | Alternative (if not using Renovate) |
| `scripts/audit/audit-all.sh` | Manual audit script                 |

## Setup Steps

1. Install Renovate GitHub App (if using Renovate)
2. Commit `renovate.json`
3. Enable Dependabot alerts in GitHub settings
4. Configure branch protection to require CI pass

## Estimated Effort

~2 hours (mostly configuration)
