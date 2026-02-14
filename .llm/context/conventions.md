# Podverse Conventions

## TypeScript

- Strict mode, no `any` types
- DTOs from `@podverse/helpers`

## Naming

- Files: kebab-case
- Classes: PascalCase
- Functions: camelCase
- Constants: SCREAMING_SNAKE_CASE

## Style

- Semicolons required, single quotes
- Trailing commas, 2-space indent

## Git

- Present tense commits
- Include issue refs (#123)
- Branches: feature/, fix/, chore/

## GitHub Issues

**Templates**: Use appropriate templates for different work types

- Bug Report: `bug` label
- Feature Request: `enhancement` label
- Technical Improvement: `technical-improvement` label (refactoring, optimization)
- Infrastructure: `infra` label (hosting, deployment, CI/CD)
- Documentation: `docs` label

**Labels**: See [docs/GITHUB-LABELS.md](../../docs/GITHUB-LABELS.md) for complete reference

## Import Order

Organize imports in this order, separated by blank lines:

1. Node built-ins (`fs`, `path`, etc.)
2. External packages (`express`, `typeorm`, etc.)
3. Workspace packages (`@podverse/helpers`, `@podverse/orm`, etc.)
4. Relative imports (local files)

```typescript
import path from 'path';

import express from 'express';
import { DataSource } from 'typeorm';

import { logger } from '@podverse/helpers';
import { Podcast } from '@podverse/orm';

import { config } from './config';
```

## Error Handling

### API Errors

- Use custom error classes for known error types
- Return appropriate HTTP status codes
- Log errors with context for debugging

```typescript
try {
  const result = await someOperation();
  return result;
} catch (error) {
  logger.error('someOperation failed', { error, context });
  throw error;
}
```

### Service Errors

- Let errors propagate to callers
- Add context when rethrowing
- Use typed errors when possible

## Logging

Use the centralized logger from `@podverse/helpers`:

```typescript
import { logger } from '@podverse/helpers';

// Info for normal operations
logger.info('Processing feed', { feedUrl, podcastId });

// Warn for recoverable issues
logger.warn('Retrying request', { attempt, maxAttempts });

// Error for failures
logger.error('Feed parsing failed', { error, feedUrl });

// Debug for development
logger.debug('Query result', { count: results.length });
```

### Logging Guidelines

- Always include relevant context objects
- Don't log sensitive data (passwords, tokens)
- Use appropriate log levels
- Keep messages concise but descriptive

## Environment Variables

### Naming Pattern

- Use SCREAMING_SNAKE_CASE
- Prefix by service when needed: `DB_`, `REDIS_`, `MQ_`

### Organization

- Templates in `infra/config/env-templates/`
- Local overrides in `infra/config/local/` (gitignored)
- Documented in `docs/ENV.md`

### Accessing in Code

```typescript
const dbHost = process.env.DB_HOST || 'localhost';
const dbPort = parseInt(process.env.DB_PORT || '5432', 10);
```

### Required vs Optional

- Document which are required for startup
- Provide sensible defaults for optional vars
- Validate required vars early in app initialization
