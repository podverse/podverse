# Phase 7: Environment Variables

**Status**: Planned

## Overview

Establish a consistent environment variable strategy across all apps, maintaining the existing validation patterns from podverse-api and podverse-web.

## Current Patterns

### podverse-api (from ENV.md)

- Validation in `src/lib/startup/validation.ts`
- No default values - all from `.env`
- Categorized variables (Auth, Database, API, etc.)
- Conditional requirements based on `ACCOUNT_SIGNUP_MODE`
- Startup abort on missing required vars

### podverse-web (from ENV.md)

- Validation in `scripts/validate-env.ts` (pre-build)
- All vars prefixed with `NEXT_PUBLIC_`
- Theme/locale validation
- Build abort on missing required vars

## Monorepo Directory Structure

```
infra/
  config/
    env-templates/
      podverse-api.env.example
      podverse-web.env.example
      podverse-workers.env.example
      podverse-management-api.env.example
      podverse-management-web.env.example
      podverse-db.env.example
      podverse-mq.env.example
      podverse-keyvaldb.env.example
    local/
      podverse-local-api.env
      podverse-local-db.env
      podverse-local-keyvaldb.env
      podverse-local-mq.env
      podverse-local-workers.env
      podverse-local-management-api.env
      podverse-local-management-db.env
    google/
      firebase/
        firebase-admin.json.example
```

## Per-App Environment Files

Each app loads its own `.env` file from its directory:

```
apps/
  api/
    .env              # Local dev (gitignored)
    .env.example      # Template (committed)
    ENV.md            # Documentation (committed)
  web/
    .env              # Local dev (gitignored)
    .env.example      # Template (committed)
    ENV.md            # Documentation (committed)
  workers/
    .env
    .env.example
    ENV.md
  management-api/
    .env
    .env.example
    ENV.md
  management-web/
    .env
    .env.example
    ENV.md
```

## Shared Validation Utilities

Move common validation logic to `@podverse/helpers`:

```typescript
// packages/helpers/src/lib/validation/env.ts

export interface EnvValidationResult {
  isValid: boolean
  errors: string[]
  warnings: string[]
}

export function validateRequired(
  name: string,
  value: string | undefined
): EnvValidationResult {
  if (!value || value.trim() === '') {
    return {
      isValid: false,
      errors: [`${name} is required but not set`],
      warnings: [],
    }
  }
  return { isValid: true, errors: [], warnings: [] }
}

export function validateNumeric(
  name: string,
  value: string | undefined
): EnvValidationResult {
  if (!value) {
    return { isValid: true, errors: [], warnings: [] }
  }
  const num = parseInt(value, 10)
  if (isNaN(num) || num < 0) {
    return {
      isValid: false,
      errors: [`${name} must be a valid positive number`],
      warnings: [],
    }
  }
  return { isValid: true, errors: [], warnings: [] }
}

export function validateUUID(
  name: string,
  value: string | undefined
): EnvValidationResult {
  if (!value) {
    return { isValid: true, errors: [], warnings: [] }
  }
  const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
  if (!uuidRegex.test(value)) {
    return {
      isValid: false,
      errors: [`${name} must be a valid UUID`],
      warnings: [],
    }
  }
  return { isValid: true, errors: [], warnings: [] }
}

export function validateUserAgent(
  name: string,
  value: string | undefined
): EnvValidationResult {
  if (!value) {
    return { isValid: true, errors: [], warnings: [] }
  }
  // Format: BrandName Bot Environment/AppName/Version
  if (!value.includes('Bot') || !value.includes('/')) {
    return {
      isValid: false,
      errors: [`${name} must follow format: BrandName Bot Environment/AppName/Version`],
      warnings: [],
    }
  }
  return { isValid: true, errors: [], warnings: [] }
}

export function printValidationSummary(
  results: Map<string, EnvValidationResult>,
  category: string
): void {
  console.log(`\n[${category}]`)
  for (const [name, result] of results) {
    const status = result.isValid ? '✓' : '✗'
    console.log(`  ${status} ${name}`)
    for (const error of result.errors) {
      console.log(`      ${error}`)
    }
  }
}
```

## Docker Service Environment

Docker Compose files reference env files from `infra/config/local/`:

```yaml
# infra/docker/local/docker-compose.yml
services:
  podverse_local_db:
    env_file:
      - ../../config/local/podverse-local-db.env

  podverse_local_mq:
    env_file:
      - ../../config/local/podverse-local-mq.env

  podverse_local_keyvaldb:
    env_file:
      - ../../config/local/podverse-local-keyvaldb.env
```

## Environment Variable Categories

### Shared Across Apps

| Variable | Used By | Description |
|----------|---------|-------------|
| `DB_HOST` | api, workers, management-api | Database hostname |
| `DB_PORT` | api, workers, management-api | Database port |
| `MESSAGE_QUEUE_*` | api, workers | RabbitMQ connection |
| `KEYVALDB_*` | api, workers | Valkey/Redis connection |

### App-Specific

**api**:
- `API_PORT`, `API_PREFIX`, `API_VERSION`
- `AUTH_JWT_SECRET`
- `MAILER_*` (conditional)
- `PAYPAL_*` (optional)

**web**:
- `NEXT_PUBLIC_*` (all public)
- `NEXT_PUBLIC_API_*` (API connection)
- `NEXT_PUBLIC_SSR_API_*` (SSR API)

**workers**:
- `PODCAST_INDEX_*`
- Worker-specific job configs

## Validation Integration

### API Startup (apps/api/src/lib/startup/validation.ts)

```typescript
import {
  validateRequired,
  validateNumeric,
  validateUUID,
  validateUserAgent,
  printValidationSummary,
} from '@podverse/helpers'

export function validateAllEnvironmentVariables(): void {
  const results = new Map<string, EnvValidationResult>()
  let hasErrors = false

  // Auth & Security
  results.set('AUTH_JWT_SECRET', validateUUID('AUTH_JWT_SECRET', process.env.AUTH_JWT_SECRET))
  results.set('USER_AGENT', validateUserAgent('USER_AGENT', process.env.USER_AGENT))

  // Database
  results.set('DB_HOST', validateRequired('DB_HOST', process.env.DB_HOST))
  results.set('DB_PORT', validateNumeric('DB_PORT', process.env.DB_PORT))
  // ... etc

  printValidationSummary(results, 'Environment Variables')

  for (const result of results.values()) {
    if (!result.isValid) hasErrors = true
  }

  if (hasErrors) {
    console.error('\n❌ Environment validation failed. Aborting startup.')
    process.exit(1)
  }
}
```

### Web Pre-Build (apps/web/scripts/validate-env.ts)

Similar pattern but runs before `next build`.

## Setup Instructions

### Local Development

1. Copy templates to app directories:
   ```bash
   cp infra/config/env-templates/podverse-api.env.example apps/api/.env
   cp infra/config/env-templates/podverse-web.env.example apps/web/.env
   ```

2. Edit `.env` files with local values

3. Start Docker services:
   ```bash
   make local_db_up
   make local_mq_up
   ```

### Adding New Environment Variables

1. Add to app's `ENV.md` documentation
2. Add validation in app's validation file
3. Update `infra/config/env-templates/*.env.example`
4. If shared, consider adding validation helper to `@podverse/helpers`

## Files to Create/Migrate

| Source | Destination |
|--------|-------------|
| `podverse-ops/config/*.env*` | `infra/config/` |
| `podverse-api/ENV.md` | `apps/api/ENV.md` |
| `podverse-web/ENV.md` | `apps/web/ENV.md` |
| New | `packages/helpers/src/lib/validation/env.ts` |

## Estimated Effort

~4-6 hours (includes migrating all env files and validation)
