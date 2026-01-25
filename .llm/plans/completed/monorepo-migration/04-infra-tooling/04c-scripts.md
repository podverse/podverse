# Phase 4C: Utility Scripts Migration

**Status**: Ready for execution
**Estimated effort**: 2-4 hours
**Dependencies**: Part B (some scripts reference docker paths)

## Overview

Evaluate and migrate utility scripts from podverse-ops. Many scripts become obsolete in the monorepo (workspaces replace npm linking), while others need minimal changes or significant rewrites.

## Script Inventory

### Source Scripts (podverse-ops/scripts/)
```
scripts/
├── audit/
│   └── audit-all-repos.sh          # npm audit across repos
├── dev/
│   ├── commit-package-files.sh
│   ├── commit-package-lock-files.sh
│   ├── local-utils/                # password hash generator
│   ├── npm-link-modules.sh         # OBSOLETE - workspaces replace this
│   └── pull-all-repos-v5-develop.sh
├── ghcr/
│   └── getLatestAlphaTag.sh        # Get latest alpha Docker tag
├── keyvaldb/
│   ├── valkey-entrypoint.sh        # Valkey container entrypoint
│   └── valkey-healthcheck.sh       # Valkey health check
├── management/
│   ├── create-superuser.js         # Node.js superuser creation
│   ├── create-superuser.sh         # Bash wrapper
│   ├── package.json                # Dependencies
│   └── package-lock.json
├── mq/
│   └── provision_queues.sh         # Artemis queue setup
├── podcastIndex/
│   └── getFeedUrlDump.sh           # PI API helper
└── publish/
    ├── alpha-publish-all-packages.sh   # REPLACED by monorepo workflow
    └── v5-develop-update-version-all.sh # REPLACED by monorepo versioning
```

## Migration Decisions

### Scripts to Migrate (Minimal Changes)

| Script | Destination | Changes Needed |
|--------|-------------|----------------|
| `keyvaldb/valkey-entrypoint.sh` | `scripts/keyvaldb/` | None |
| `keyvaldb/valkey-healthcheck.sh` | `scripts/keyvaldb/` | None |
| `mq/provision_queues.sh` | `scripts/mq/` | Update env file paths |
| `ghcr/getLatestAlphaTag.sh` | `scripts/ghcr/` | None |
| `dev/local-utils/` | `scripts/dev/local-utils/` | None |

### Scripts to Migrate (Significant Rewrite)

| Script | Destination | Changes Needed |
|--------|-------------|----------------|
| `management/create-superuser.*` | `scripts/management/` | Update for monorepo structure |
| `audit/audit-all-repos.sh` | `scripts/audit/audit.sh` | Rewrite for workspaces (single repo) |
| `podcastIndex/getFeedUrlDump.sh` | `scripts/podcast-index/` | Path updates |

### Scripts to NOT Migrate (Obsolete)

| Script | Reason |
|--------|--------|
| `dev/npm-link-modules.sh` | npm workspaces handle this automatically |
| `dev/pull-all-repos-v5-develop.sh` | Single repo now, standard git pull |
| `dev/commit-package-files.sh` | Single repo workflow |
| `dev/commit-package-lock-files.sh` | Single repo workflow |
| `publish/alpha-publish-all-packages.sh` | Replaced by monorepo publish workflow |
| `publish/v5-develop-update-version-all.sh` | Replaced by unified versioning |

## Detailed Migration Tasks

### Task 1: Keyvaldb Scripts (No changes needed)

Copy directly:
```
podverse-ops/scripts/keyvaldb/valkey-entrypoint.sh
  -> scripts/keyvaldb/valkey-entrypoint.sh

podverse-ops/scripts/keyvaldb/valkey-healthcheck.sh
  -> scripts/keyvaldb/valkey-healthcheck.sh
```

### Task 2: MQ Scripts

**provision_queues.sh** - Update env file path parameter handling:

Current usage:
```bash
./provision_queues.sh podverse_local_mq ../../../config/podverse-local-mq.env
```

New usage:
```bash
./provision_queues.sh podverse_local_mq ../../infra/config/local/mq.env
```

### Task 3: GHCR Scripts (No changes needed)

Copy directly:
```
podverse-ops/scripts/ghcr/getLatestAlphaTag.sh
  -> scripts/ghcr/getLatestAlphaTag.sh
```

### Task 4: Management Scripts

**create-superuser.sh** and **create-superuser.js**:
- Copy entire `management/` directory
- Update any hardcoded paths (none found)
- These are standalone Node.js scripts with their own package.json

```
podverse-ops/scripts/management/
  -> scripts/management/
```

### Task 5: Audit Script (Rewrite)

The multi-repo audit script becomes a single workspace audit:

**Before (multi-repo):**
```bash
# Loops through sibling directories
for repo in podverse-helpers podverse-orm ...; do
  cd "$REPOS_BASE_DIR/$repo"
  npm audit
done
```

**After (monorepo):**
```bash
#!/bin/bash
# Simple workspace audit
cd "$(dirname "$0")/../.."
npm audit --workspaces
```

New location: `scripts/audit/audit.sh`

### Task 6: Dev Local Utils

Copy the password hash generator utility:
```
podverse-ops/scripts/dev/local-utils/
  -> scripts/dev/local-utils/
```

Contains:
- `generate-password-hash.js`
- `package.json`
- `package-lock.json`

### Task 7: Podcast Index Script

Copy and update paths:
```
podverse-ops/scripts/podcastIndex/getFeedUrlDump.sh
  -> scripts/podcast-index/get-feed-url-dump.sh
```

## New Script: Audit for Workspaces

Create `scripts/audit/audit.sh`:
```bash
#!/bin/bash
# Audit all workspaces for npm vulnerabilities
set -e

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
REPO_ROOT="$(cd "$SCRIPT_DIR/../.." && pwd)"

cd "$REPO_ROOT"

echo "Running npm audit across all workspaces..."
npm audit --workspaces

echo ""
echo "Audit complete."
```

## Monorepo Already Has

The monorepo already has these scripts (do NOT overwrite):
- `scripts/start-feature.sh` - LLM history feature branching
- `scripts/complete-feature.sh` - Feature completion
- `scripts/git-hooks/` - Pre-commit, pre-push hooks

## Directory Structure After Migration

```
scripts/
├── audit/
│   └── audit.sh                    # NEW: workspace audit
├── complete-feature.sh             # KEEP: existing
├── dev/
│   └── local-utils/
│       ├── generate-password-hash.js
│       ├── package.json
│       └── package-lock.json
├── ghcr/
│   └── getLatestAlphaTag.sh
├── git-hooks/                      # KEEP: existing
├── keyvaldb/
│   ├── valkey-entrypoint.sh
│   └── valkey-healthcheck.sh
├── management/
│   ├── create-superuser.js
│   ├── create-superuser.sh
│   ├── package.json
│   └── package-lock.json
├── mq/
│   └── provision_queues.sh
├── podcast-index/
│   └── get-feed-url-dump.sh
├── publish/                        # KEEP: existing (if any)
└── start-feature.sh                # KEEP: existing
```

## Verification Steps

1. All scripts have executable permissions (`chmod +x`)
2. Scripts run without path errors
3. `scripts/mq/provision_queues.sh` works with new env file paths
4. `scripts/audit/audit.sh` runs successfully

## Notes

- The `npm-link-modules.sh` script was critical for multi-repo development but is completely unnecessary with npm workspaces
- Publishing scripts are replaced by unified versioning (see Phase 8)
- Some scripts in `scripts/dev/` may need creation for monorepo-specific workflows (e.g., starting all dev servers)
