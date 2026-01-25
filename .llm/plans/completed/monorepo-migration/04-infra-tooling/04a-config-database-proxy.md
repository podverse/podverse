# Phase 4A: Config, Database & Proxy Migration

**Status**: Ready for execution
**Estimated effort**: 1-2 hours
**Dependencies**: None

## Overview

Migrate static configuration files, database schemas/migrations, and proxy configuration from podverse-ops to the monorepo's infra directory.

## Current State

**Monorepo already has** (in `infra/config/env-templates/`):
- `api.env.example`
- `management-api.env.example`
- `management-web.env.example`
- `web.env.example`
- `workers.env.example`

**Missing infrastructure env templates**:
- `db.env.example` - PostgreSQL configuration
- `keyvaldb.env.example` - Valkey/Redis configuration
- `mq.env.example` - ActiveMQ Artemis configuration
- `management-db.env.example` - Management PostgreSQL configuration

## Tasks

### Task 1: Migrate Infrastructure Env Templates

Copy from `podverse-ops/config/` to `infra/config/env-templates/`:

| Source File | Destination |
|-------------|-------------|
| `podverse-db.env.example` | `db.env.example` |
| `podverse-keyvaldb.env.example` | `keyvaldb.env.example` |
| `podverse-mq.env.example` | `mq.env.example` |
| `podverse-management-db.env.example` | `management-db.env.example` |

### Task 2: Migrate Google/Firebase Config

```
podverse-ops/config/google/firebase/firebase-admin.json.example
  -> infra/config/google/firebase/firebase-admin.json.example
```

### Task 3: Migrate Database Files

#### Main Database

| Source | Destination |
|--------|-------------|
| `database/combined/init_database.sql` | `infra/database/combined/init_database.sql` |
| `database/init-scripts/01-create-users.sh` | `infra/database/init-scripts/01-create-users.sh` |
| `database/migrations/*.sql` (13 files) | `infra/database/migrations/` |
| `database/seed-scripts/*.sql` (2 files) | `infra/database/seeds/` |
| `database/scripts/combine_all_migrations.sh` | `infra/database/scripts/combine_all_migrations.sh` |

#### Management Database

| Source | Destination |
|--------|-------------|
| `database/management/combined/` | `infra/database/management/combined/` |
| `database/management/init-scripts/` | `infra/database/management/init-scripts/` |
| `database/management/migrations/` | `infra/database/management/migrations/` |
| `database/management/scripts/` | `infra/database/management/scripts/` |
| `database/management/seed-scripts/` | `infra/database/management/seeds/` |

### Task 4: Migrate Proxy Configuration

```
podverse-ops/proxy/proxy.conf -> infra/proxy/proxy.conf
```

## File Inventory

### Config Files (4 new + 1 google)
- `db.env.example` (7 lines)
- `keyvaldb.env.example` (5 lines)
- `mq.env.example` (2 lines)
- `management-db.env.example`
- `google/firebase/firebase-admin.json.example`

### Database Files (Main - 17 files)
- `combined/init_database.sql` (~1844 lines)
- `init-scripts/01-create-users.sh`
- `migrations/0000_init_helpers.sql` through `0012_account_settings.sql` (13 files)
- `seed-scripts/local-dev-account.sql`
- `seed-scripts/local-lighthouse-test-fixtures.sql`
- `scripts/combine_all_migrations.sh`

### Database Files (Management - 6 files)
- `combined/init_management_database.sql`
- `init-scripts/01-create-users.sh`
- `migrations/0000_init_helpers.sql`
- `migrations/0001_init_admin_accounts.sql`
- `scripts/combine_all_migrations.sh`

### Proxy Files (1 file)
- `proxy.conf` (23 lines)

## Verification Steps

1. All .env.example files are valid (no syntax errors)
2. All .sql files are valid SQL
3. Shell scripts have proper shebang and are executable
4. Directory structure matches plan

## Notes

- The `podverse-local-*.env` files are local development configs that should NOT be committed - they're gitignored
- The `podverse-alpha-*.env` files are server-specific and should NOT be migrated
- Only `.example` files should be migrated as templates
