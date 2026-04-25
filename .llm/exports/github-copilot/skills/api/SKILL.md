---
name: api
description: Common patterns for the podverse-api Express application
version: 1.0.0
---


# Podverse API Development Patterns

This skill provides quick reference for common patterns used in the podverse-api application.

## Monorepo Context

- **API app location**: `apps/api/`
- **Helper packages** (from `packages/helpers*/`): `@podverse/helpers`, `@podverse/helpers-validation`, `@podverse/helpers-requests`, `@podverse/helpers-backend`, `@podverse/helpers-config`
- **ORM entities**: `@podverse/orm` (from `packages/orm/`)
- **Message queue**: `@podverse/mq` (from `packages/mq/`)
- **Feed parsing**: `@podverse/parser` (from `packages/parser/`)

## Key Dependencies

| Package                       | Purpose                                    |
| ----------------------------- | ------------------------------------------ |
| Helper packages               | Types, DTOs, utilities, validation, config |
| `@podverse/orm`               | Database entities and services             |
| `@podverse/mq`                | Message queue operations                   |
| `@podverse/parser`            | Feed parsing                               |
| `@podverse/external-services` | Third-party service integrations           |
| `@podverse/notifications`     | Push notifications                         |

## Patterns

### Route Definition

```typescript
// apps/api/src/routes/podcast.ts
import { Router } from 'express';
import { PodcastController } from '../controllers/podcast';
import { asyncHandler } from '../lib/asyncHandler';

const router = Router();

router.get('/:id', asyncHandler(PodcastController.getById));
router.post('/', asyncHandler(PodcastController.create));

export default router;
```

### Controller Pattern

```typescript
// apps/api/src/controllers/podcast.ts
import { Request, Response } from 'express';
import { PodcastService } from '@podverse/orm';

export const PodcastController = {
  async getById(req: Request, res: Response): Promise<void> {
    try {
      const { id } = req.params;
      const podcast = await PodcastService.getById(id);

      if (!podcast) {
        res.status(404).json({ error: 'Podcast not found' });
        return;
      }

      res.json(podcast);
    } catch (error) {
      console.error('Error getting podcast:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  },

  async create(req: Request, res: Response): Promise<void> {
    try {
      const data = req.body;
      const podcast = await PodcastService.create(data);
      res.status(201).json(podcast);
    } catch (error) {
      console.error('Error creating podcast:', error);
      res.status(500).json({ error: 'Internal server error' });
      return;
    }
  },
};
```

### TypeScript Express Patterns

#### Route Handler Return Values

Express route handlers should be typed as `Promise<void>` (or `void` for sync). Since `res.json()` returns a `Response` object, avoid using `return` with response methods.

**Correct patterns:**

```typescript
// Early exit with status (use return for control flow)
if (!item) {
  res.status(404).json({ error: 'Not found' });
  return; // Return void, not Response
}

// Success response (no return needed)
res.json(data);
```

**Incorrect pattern:**

```typescript
// DON'T do this - returns Response instead of void
return res.json(data);
return res.status(404).json({ error: 'Not found' });
```

#### Exception: Early Exit Convenience

The `return` keyword is acceptable for early exits when combined with response methods for single-line control flow:

```typescript
if (!user) {
  res.status(401).json({ error: 'Unauthorized' });
  return;
}
```

#### Catch Block Returns

Always return explicitly in catch blocks to satisfy TypeScript's `noImplicitReturns`:

```typescript
try {
  // ... handler logic
  res.json(result);
} catch (error) {
  handleError(res, error);
  return; // Required even though handleError sends response
}
```

**With conditional response:**

```typescript
} catch (error) {
  console.error('Error:', error);
  if (!res.headersSent) {
    res.status(500).json({ error: 'Internal error' });
  }
  return;  // Required for all code paths
}
```

### Rate Limiting

```typescript
// apps/api/src/lib/rateLimiter.ts
import { rateLimitAuthEndpoint, rateLimitEndpoint } from '@api/lib/rateLimiter';

// For authenticated endpoints (per-user rate limiting)
router.get(
  '/download-data',
  rateLimitAuthEndpoint({ windowMs: 24 * 60 * 60 * 1000, max: 3 }),
  asyncHandler(AccountController.downloadData)
);

// For public endpoints (IP-based rate limiting)
router.post(
  '/create',
  rateLimitEndpoint({ windowMs: 10 * 60 * 1000, max: 3 }),
  asyncHandler(AccountController.create)
);
```

### Error Handling

```typescript
// Use asyncHandler to catch errors automatically
import { asyncHandler } from '../lib/asyncHandler';

router.get(
  '/:id',
  asyncHandler(async (req, res) => {
    // Errors here are caught and passed to error middleware
    const result = await riskyOperation();
    res.json(result);
  })
);
```

### Environment Validation

See `apps/api/src/lib/startup/validation.ts` for environment variable validation patterns.

**Env file alignment:** All `.env` files (including `infra/config/local/*.env`) must match the organization, section comments, and variable order of their authoritative `.env.example`; only values may differ.

**Lighthouse alignment:** When validation changes here, update
`tools/web-perf/lighthouse/.env.api.example` and `.env.api` so the Lighthouse runner
stays in sync with API startup validation.

## File Structure

```
apps/api/
├── src/
│   ├── controllers/     # Request handlers
│   ├── routes/          # Route definitions
│   ├── middleware/      # Express middleware
│   ├── lib/             # Utilities and helpers
│   │   ├── startup/     # App initialization
│   │   └── rateLimiter.ts
│   └── index.ts         # Entry point
├── package.json
└── tsconfig.json
```

## Related Skills

- **[Web Patterns](../web/SKILL.md)** - Client-side patterns
- **[ORM Patterns](../orm/SKILL.md)** - Database patterns
- **[Global Patterns](../global/SKILL.md)** - Monorepo conventions
