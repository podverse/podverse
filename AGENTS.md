# AI Development Guide

This document provides rules and patterns for AI coding assistants working on the Podverse monorepo. It consolidates critical information that helps AI tools generate correct, consistent code.

## Quick Reference

| Item            | Value                                              |
| --------------- | -------------------------------------------------- |
| Node.js         | 24+ (see `.nvmrc`)                                 |
| Package Manager | npm workspaces                                     |
| Style           | Semicolons required, single quotes, 2-space indent |
| TypeScript      | Strict mode, no `any` types                        |

### Essential Commands

All commands below are run **from the monorepo root** (do not `cd` into apps first). Use `-w apps/<name>` to run workspace scripts from root. When providing runnable commands in responses, **always put them in a fenced code block** (e.g. ```bash) so the IDE shows a copy button.

```bash
npm run build:packages # Build packages (required before apps)
npm run lint           # Lint all packages and apps
npm run dev:api        # Start API (localhost:3000)
npm run dev:web        # Start web app (localhost:3002)
npm run dev:all        # Start everything with watch mode
```

### Nix / terminal (agent sandbox)

Node and npm are provided by the repo's Nix flake, not a global install. When running terminal commands (e.g. in Cursor's agent), use the wrapper so the correct environment is available:

- **Wrapper:** `./scripts/nix/with-env <command> [args...]`
- **Examples:** `./scripts/nix/with-env npm run build:packages`, `./scripts/nix/with-env npm run lint`
- Run from repo root. Full explanation and setup-in-other-repos: [docs/development/CURSOR-NIX-WITH-ENV.md](docs/development/CURSOR-NIX-WITH-ENV.md).

### Lock file and workspace dependencies

All monorepo Dockerfiles use `npm ci` for reproducible installs. The root `package-lock.json` must match all workspace `package.json` files. The Make targets that build Docker images (e.g. `local_build_api`, `local_build_web`, `local_build_web_runtime_config`, `local_build_test_assets`, `local_build_all`) automatically run `sync_lockfile` first so the lock file is in sync before `npm ci` runs in the container. After adding, removing, or renaming workspace packages, run `make sync_lockfile` and commit the updated `package-lock.json` so the change is committed; the next Docker build will use the updated lock file from the context.

**Linux-canonical lockfile:** CI runs on Linux and needs Linux optional deps (e.g. `@parcel/watcher`, `@next/swc-linux-x64-gnu`, next-intl’s `@swc/core`) in the lockfile. Generate or refresh the lockfile under Linux so it stays correct for CI: run `./scripts/development/update-lockfile-linux.sh` (requires Docker). The bump-version script runs this automatically before committing. When you add or update dependencies from a Mac, run that script and commit the updated `package-lock.json`.

**Workers (example: add feeds from Podcast Index DB):**

```bash
npm run dev_pi_bulk_feeds_add_from_file -w apps/workers -- -startId 1 -endId 10 -q rss-slow
```

### Package Build Order

Build packages in this order (dependencies must be built first):

1. `helpers` (core utilities, types, DTOs) — **MUST build first**
2. Then in parallel:
   - `helpers-validation` (validation utilities)
   - `helpers-requests` (API request types and utilities)
   - `helpers-backend` (backend-specific utilities)
   - `helpers-browser` (browser-specific utilities)
   - `helpers-config` (configuration validation)
3. `external-services-firebase`, `external-services-paypal`, `external-services-podcast-index` (parallel)
4. `orm`
5. `notifications`
6. `parser`
7. `mq`

**Note:** The 5 specialized helper packages (validation, requests, backend, browser, config) all depend on core `@podverse/helpers` but don't depend on each other, so they can build in parallel after `helpers` completes.

## Critical Rules

### Environment Variables

**Never set default values in `config/index.ts` files.**

```typescript
// BAD - hides configuration errors
dbHost: process.env.DB_HOST || 'localhost';
dbHost: process.env.DB_HOST ?? '';

// GOOD - fails fast if not configured
dbHost: process.env.DB_HOST!;
```

Config files are the ONE exception where `!` assertions are allowed because validation runs at startup before config is used. Add this eslint-disable at the top:

```typescript
/* eslint-disable @typescript-eslint/no-non-null-assertion -- env vars validated at startup */
```

### HTTP / request helpers

Use the shared request helpers for all HTTP calls; do not use raw `fetch()`.

- **Server/Node:** Use `fetchWithTimeout` from `@podverse/helpers-backend` (timeout, cache, body, headers). The only place that may call native `fetch` is inside that helper.
- **Browser/isomorphic:** Use `request` (and optionally `requestWithHeaders`) from `@podverse/helpers-requests`; they return `{ status, data }` and use axios under the hood.

### Environment File Formatting

In `.env` files:

- **Non-empty values**: Use double quotes
- **Empty/unset values**: No value after `=`
- **Alignment with .env.example**: All `.env` files (including `infra/config/local/*.env`) must match the organization, section comments, and variable order of their authoritative `.env.example`; only values may differ
- **Web and Management Web**: `apps/web/.env.local` and `apps/management-web/.env.local` contain only `RUNTIME_CONFIG_URL`; the runtime-config sidecar uses `apps/web/sidecar/.env` and `apps/management-web/sidecar/.env` (created by `make local_env_setup`)

```bash
# Correct
DATABASE_HOST="localhost"
EMPTY_VALUE=

# Incorrect
DATABASE_HOST=localhost
EMPTY_VALUE=""
```

### Import Order

Organize imports with blank lines between groups:

```typescript
import path from 'path'; // 1. Node built-ins

import express from 'express'; // 2. External packages

import { logger } from '@podverse/helpers'; // 3. Workspace packages
import { Podcast } from '@podverse/orm';

import { config } from './config'; // 4. Relative imports
```

Enforced by ESLint; fix with `npm run lint:fix`. Styles (CSS/SCSS) go last in components/pages.

### ESM and import type

- **ESM**: Relative imports use `.js` extensions. Packages and apps use ESM (NodeNext in `tsconfig.base.json`).
- **Type-only imports**: Use `import type { X } from '...'` when the import is only used as a type (avoids runtime references and helps with circular deps). Keep value imports when the symbol is used at runtime (e.g. classes for `instanceof`, decorators that need the constructor).
- **Separate line for types**: Do not mix type and value in one import. Use a separate `import type { ... }` line (e.g. `import { DataSource } from 'typeorm';` and `import type { DataSourceOptions } from 'typeorm';`). ESLint `consistent-type-imports` with `fixStyle: 'separate-type-imports'` enforces this.

### Type assertions

It is **critical** to avoid `as` (type assertions) as much as possible. Prefer improving types (DTOs, interfaces), optional chaining, and type guards; use `as` only when there is no better option, and confine or document those cases.

## Architecture

### Directory Structure

```
packages/           # Publishable npm packages (@podverse/*)
  helpers/          # Utilities, types, DTOs, logging
  external-services/# Third-party API integrations
  orm/              # Database entities, services, migrations
  notifications/    # Push notification services
  parser/           # RSS/Podcast feed parsing
  mq/               # Message queue operations

apps/               # Deployable applications
  api/              # REST API (Express)
  web/              # Web app (Next.js)
  workers/          # Background job processors
  management-api/   # Admin API
  management-web/   # Admin dashboard
```

### Where to Find Things

| Looking for...             | Location                                                                         |
| -------------------------- | -------------------------------------------------------------------------------- |
| API routes                 | `apps/api/src/routes/`                                                           |
| Database entities          | `packages/orm/src/entities/`                                                     |
| Database services          | `packages/orm/src/services/`                                                     |
| Shared types/DTOs          | `packages/helpers/src/dto/`                                                      |
| Feed parsing               | `packages/parser/src/`                                                           |
| Web pages                  | `apps/web/src/app/`                                                              |
| Environment templates      | `infra/config/env-templates/` (app stubs link to `apps/*/.env.example`)          |
| Workers startup validation | `apps/workers/src/lib/startup/validation.ts` (see [ENV.md](apps/workers/ENV.md)) |
| K8s manifests              | `infra/k8s/`                                                                     |
| Jenkins pipelines          | `infra/pipelines/jenkins/`                                                       |
| GitHub Actions             | `.github/workflows/`                                                             |

## Coding Patterns

### Service Pattern

Business logic lives in `*Service` classes with static methods:

```typescript
// packages/orm/src/services/PodcastService.ts
export class PodcastService {
  static async findById(id: string): Promise<Podcast | null> {
    // implementation
  }
}
```

### Logger Pattern

Use the centralized logger from `@podverse/helpers`:

```typescript
import { logger } from '@podverse/helpers';

logger.info('Processing feed', { feedUrl, podcastId });
logger.warn('Retrying request', { attempt, maxAttempts });
logger.error('Feed parsing failed', { error, feedUrl });
```

### Error Handling

- Don't log expected errors (e.g., 401 for unauthenticated users)
- Include context when logging errors
- Let errors propagate to callers, add context when rethrowing

```typescript
// BAD - logs expected behavior as error
} catch (error) {
  console.error('Auth check error:', error)
}

// GOOD - only log unexpected errors
} catch (error) {
  const isExpected = isUnauthorizedError(error)
  if (!isExpected) {
    logger.error('Unexpected auth error', { error })
  }
  return null
}
```

## Anti-Patterns (Do Not Do)

### Configuration

- ❌ Set default values in `config/index.ts`
- ❌ Set a default for LOG_DIR in any app (empty = console-only; see logging skill or [logs/LOGS.md](logs/LOGS.md))
- ❌ Use `!` assertions outside of config files
- ❌ Add env vars without updating validation scripts (`lib/startup/validation.ts`)

### i18n / Translations

- ❌ Modify files in `i18n/compiled/` (generated at build time, not committed)
- ❌ Add locales without updating all sync points (see `docs/localization/I18N.md`)
- ❌ Use empty strings in `i18n/originals/` (use override files for blanks)

### General

- ❌ Skip `npm run build:packages` before running apps
- ❌ Import from package `src/` directly (use `@podverse/package-name`)
- ❌ Add features beyond what was requested (keep changes focused)
- ❌ Create abstractions for one-time operations

## Testing and Verification

### Before Submitting Changes

1. **Lint passes**: `npm run lint`
2. **Builds succeed**: `npm run build:packages`
3. **App starts**: Test affected app with `npm run dev:api` or `npm run dev:web`
4. **Manual verification**: Test the specific feature/fix in browser or via API

### What "Done" Means

- Code compiles without errors
- Linting passes
- Feature works as specified (manual test)
- No unrelated changes included
- Documentation updated if behavior changed

## LLM History Tracking

When making changes, update `.llm/history/active/[feature]/[feature].md` (or the latest part file):

- **Before file-modifying work:** If the current branch matches an existing `.llm/history/active/[feature]/` (e.g. branch `chore/first-test-issue` → `first-test-issue`), update that history file; no exception for small changes.

```markdown
### Session N - YYYY-MM-DD

#### Prompt (Developer)

[What was requested]

#### Key Decisions

- Decision 1

#### Files Modified

- path/to/file.ts
```

See `.llm/LLM.md` for full guidelines.

## References

- [Quick Start Guide](docs/QUICKSTART.md) - Setup and running locally
- [Architecture](docs/architecture/ARCHITECTURE.md) - System design and data flow
- [V4V MetaBoost + LNURL](docs/v4v/bitcoin/lnd/V4V-METABOOST-LNURL.md) - Value-for-value boost flow and local setup
- [Contributing](docs/development/CONTRIBUTING.md) - Workflow and PR guidelines
- [Lockfile (Linux)](docs/development/LOCKFILE-LINUX.md) - Generating package-lock.json for CI
- [i18n Guide](docs/localization/I18N.md) - Translation system details
- [IDE Setup](docs/development/IDE-SETUP.md) - VS Code configuration
