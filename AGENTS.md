# AI Development Guide

This document provides rules and patterns for AI coding assistants working on the Podverse monorepo. It consolidates critical information that helps AI tools generate correct, consistent code.

## Quick Reference

| Item            | Value                                        |
| --------------- | -------------------------------------------- |
| Node.js         | 22+ (see `.nvmrc`)                           |
| Package Manager | npm workspaces                               |
| Style           | No semicolons, single quotes, 2-space indent |
| TypeScript      | Strict mode, no `any` types                  |

### Essential Commands

```bash
npm run build:packages # Build packages (required before apps)
npm run lint           # Lint all packages and apps
npm run dev:api        # Start API (localhost:1234)
npm run dev:web        # Start web app (localhost:3000)
npm run dev:all        # Start everything with watch mode
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
3. `external-services`
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

### Environment File Formatting

In `.env` files:

- **Non-empty values**: Use double quotes
- **Empty/unset values**: No value after `=`

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

| Looking for...        | Location                      |
| --------------------- | ----------------------------- |
| API routes            | `apps/api/src/routes/`        |
| Database entities     | `packages/orm/src/entities/`  |
| Database services     | `packages/orm/src/services/`  |
| Shared types/DTOs     | `packages/helpers/src/dto/`   |
| Feed parsing          | `packages/parser/src/`        |
| Web pages             | `apps/web/src/app/`           |
| Environment templates | `infra/config/env-templates/` |

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
- ❌ Use `!` assertions outside of config files
- ❌ Add env vars without updating validation scripts (`lib/startup/validation.ts`)

### i18n / Translations

- ❌ Modify files in `i18n/compiled/` (generated at build time, not committed)
- ❌ Add locales without updating all sync points (see `docs/i18n.md`)
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
- [Architecture](docs/ARCHITECTURE.md) - System design and data flow
- [Contributing](docs/CONTRIBUTING.md) - Workflow and PR guidelines
- [i18n Guide](docs/i18n.md) - Translation system details
- [IDE Setup](docs/IDE-SETUP.md) - VS Code configuration
