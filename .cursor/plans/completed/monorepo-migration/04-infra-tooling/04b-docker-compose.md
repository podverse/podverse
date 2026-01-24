# Phase 4B: Docker Compose Migration

**Status**: Ready for execution
**Estimated effort**: 2-3 hours
**Dependencies**: Part A (config/database must be migrated first)

## Overview

Migrate all Docker Compose files from podverse-ops to the monorepo, updating relative paths to match the new directory structure.

## Directory Structure

### Source (podverse-ops)
```
docker-compose/
├── alpha/          (9 files - 5 templates, 4 static)
├── ci/             (1 file)
├── local/          (9 files)
├── sandbox/        (6 files - 3 templates, 3 static)
└── test/           (1 file)
```

### Target (monorepo)
```
infra/docker/
├── alpha/
├── ci/
├── local/
├── sandbox/
└── test/
```

## Path Update Rules

### From `infra/docker/local/api/` (3 levels up to infra/)

| Old Path | New Path |
|----------|----------|
| `../../../config/podverse-local-api.env` | `../../config/local/api.env` |
| `../../../config/google/firebase/` | `../../config/google/firebase/` |
| `../../../database/combined/` | `../../database/combined/` |
| `../../../database/init-scripts/` | `../../database/init-scripts/` |
| `../../../database/seed-scripts/` | `../../database/seeds/` |
| `../../../logs/` | `../../../../logs/` (stays at repo root) |

### Config File Renaming Convention

| Old Name | New Name |
|----------|----------|
| `podverse-local-api.env` | `local/api.env` |
| `podverse-local-db.env` | `local/db.env` |
| `podverse-local-workers.env` | `local/workers.env` |
| `podverse-alpha-api.env` | `alpha/api.env` |
| `podverse-test-db.env` | `test/db.env` |

## Files to Migrate

### Local Environment (9 files)

| Service | Source | Path Updates Needed |
|---------|--------|---------------------|
| api | `local/api/docker-compose.yml` | env_file |
| db | `local/db/docker-compose.yml` | env_file, database volumes |
| keyvaldb | `local/keyvaldb/docker-compose.yml` | env_file |
| management-api | `local/management-api/docker-compose.yml` | env_file |
| management-db | `local/management-db/docker-compose.yml` | env_file, database volumes |
| management-web | `local/management-web/docker-compose.yml` | env_file |
| mq | `local/mq/docker-compose.yml` | env_file |
| web | `local/web/docker-compose.yml` | env_file |
| workers | `local/workers/docker-compose.yml` | env_file, firebase, logs |

### Alpha Environment (9 files - templates)

| Service | Source | Path Updates Needed |
|---------|--------|---------------------|
| api | `alpha/api/docker-compose.yml.template` | env_file |
| db | `alpha/db/docker-compose.yml` | env_file, database volumes |
| keyvaldb | `alpha/keyvaldb/docker-compose.yml` | env_file |
| management-api | `alpha/management-api/docker-compose.yml.template` | env_file |
| management-db | `alpha/management-db/docker-compose.yml` | env_file, database volumes |
| management-web | `alpha/management-web/docker-compose.yml.template` | env_file |
| mq | `alpha/mq/docker-compose.yml` | env_file |
| web | `alpha/web/docker-compose.yml.template` | env_file |
| workers | `alpha/workers/docker-compose.yml.template` | env_file, firebase, logs |

### Sandbox Environment (6 files)

| Service | Source | Path Updates Needed |
|---------|--------|---------------------|
| api | `sandbox/api/docker-compose.yml.template` | env_file |
| db | `sandbox/db/docker-compose.yml` | env_file, database volumes |
| keyvaldb | `sandbox/keyvaldb/docker-compose.yml` | env_file |
| mq | `sandbox/mq/docker-compose.yml` | env_file |
| web | `sandbox/web/docker-compose.yml.template` | env_file |
| workers | `sandbox/workers/docker-compose.yml.template` | env_file, firebase, logs |

### Test Environment (1 file)

| Service | Source | Path Updates Needed |
|---------|--------|---------------------|
| db | `test/db/docker-compose.yml` | env_file, database volumes |

### CI Environment (1 file)

| Service | Source | Notes |
|---------|--------|-------|
| ci | `ci/docker-compose.yml` | Jenkins setup - may need different handling |

## Example Path Updates

### Before (local/db/docker-compose.yml)
```yaml
env_file:
  - ../../../config/podverse-local-db.env
volumes:
  - ../../../database/combined/init_database.sql:/opt/database/combined/init_database.sql
  - ../../../database/init-scripts/01-create-users.sh:/opt/database/init-scripts/01-create-users.sh
  - ../../../database/seed-scripts:/opt/database/seed-scripts
```

### After (infra/docker/local/db/docker-compose.yml)
```yaml
env_file:
  - ../../config/local/db.env
volumes:
  - ../../database/combined/init_database.sql:/opt/database/combined/init_database.sql
  - ../../database/init-scripts/01-create-users.sh:/opt/database/init-scripts/01-create-users.sh
  - ../../database/seeds:/opt/database/seed-scripts
```

### Before (local/workers/docker-compose.yml)
```yaml
env_file:
  - ../../../config/podverse-local-workers.env
volumes:
  - ../../../config/google/firebase/firebase-admin.json:/opt/config/google/firebase/firebase-admin.json:ro
  - ../../../logs/workers:/opt/logs
```

### After (infra/docker/local/workers/docker-compose.yml)
```yaml
env_file:
  - ../../config/local/workers.env
volumes:
  - ../../config/google/firebase/firebase-admin.json:/opt/config/google/firebase/firebase-admin.json:ro
  - ../../../../logs/workers:/opt/logs
```

## Config Directory Structure Update

The config directory needs environment-specific subdirectories:

```
infra/config/
├── env-templates/          # .example files (already exists)
│   ├── api.env.example
│   ├── db.env.example
│   └── ...
├── local/                  # Local dev configs (gitignored)
│   ├── api.env
│   ├── db.env
│   └── ...
├── alpha/                  # Alpha configs (gitignored)
│   └── ...
├── test/                   # Test configs
│   └── db.env
└── google/                 # Google/Firebase configs
    └── firebase/
```

## Tasks

### Task 1: Create config subdirectory structure
- Create `infra/config/local/`, `infra/config/alpha/`, `infra/config/test/`
- Update `.gitignore` to ignore `infra/config/local/*` and `infra/config/alpha/*`

### Task 2: Migrate local docker-compose files
- Copy all 9 files from `docker-compose/local/`
- Update all path references

### Task 3: Migrate alpha docker-compose files
- Copy all 9 files from `docker-compose/alpha/`
- Update all path references

### Task 4: Migrate sandbox docker-compose files
- Copy all 6 files from `docker-compose/sandbox/`
- Update all path references

### Task 5: Migrate test docker-compose files
- Copy 1 file from `docker-compose/test/`
- Update all path references

### Task 6: Evaluate CI docker-compose
- Review `ci/docker-compose.yml` (Jenkins setup)
- Decide if it belongs in monorepo or stays separate

## Verification Steps

1. Run `docker-compose config` in each directory to validate YAML
2. Test `docker-compose up -d` for local environment
3. Verify all volume paths resolve correctly
4. Ensure env files are found (after creating local copies from templates)

## Notes

- The CI docker-compose.yml is Jenkins infrastructure setup, may be better suited for podverse-ansible
- Template files (`.template`) are for deployment pipelines that substitute version numbers
- Logs directory stays at repo root level, not in infra/
