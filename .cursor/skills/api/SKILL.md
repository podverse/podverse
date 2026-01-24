---
name: podverse-api-patterns
description: Common patterns for the podverse-api Express application
version: 1.0.0
---

# Podverse API Development Patterns

This skill provides quick reference for common patterns used in the podverse-api application.

## Monorepo Context

- **API app location**: `apps/api/`
- **Shared helpers**: `@podverse/helpers` (from `packages/helpers/`)
- **ORM entities**: `@podverse/orm` (from `packages/orm/`)
- **Message queue**: `@podverse/mq` (from `packages/mq/`)
- **Feed parsing**: `@podverse/parser` (from `packages/parser/`)

## Key Dependencies

| Package | Purpose |
|---------|---------|
| `@podverse/helpers` | Types, DTOs, utilities |
| `@podverse/orm` | Database entities and services |
| `@podverse/mq` | Message queue operations |
| `@podverse/parser` | Feed parsing |
| `@podverse/external-services` | Third-party service integrations |
| `@podverse/notifications` | Push notifications |

## Patterns

### Route Definition

```typescript
// apps/api/src/routes/podcast.ts
import { Router } from 'express'
import { PodcastController } from '../controllers/podcast'
import { asyncHandler } from '../lib/asyncHandler'

const router = Router()

router.get('/:id', asyncHandler(PodcastController.getById))
router.post('/', asyncHandler(PodcastController.create))

export default router
```

### Controller Pattern

```typescript
// apps/api/src/controllers/podcast.ts
import { Request, Response } from 'express'
import { PodcastService } from '@podverse/orm'

export const PodcastController = {
  async getById(req: Request, res: Response) {
    const { id } = req.params
    const podcast = await PodcastService.getById(id)
    
    if (!podcast) {
      return res.status(404).json({ error: 'Podcast not found' })
    }
    
    res.json(podcast)
  },

  async create(req: Request, res: Response) {
    const data = req.body
    const podcast = await PodcastService.create(data)
    res.status(201).json(podcast)
  }
}
```

### Rate Limiting

```typescript
// apps/api/src/lib/rateLimiter.ts
import { rateLimitAuthEndpoint, rateLimitEndpoint } from '@api/lib/rateLimiter'

// For authenticated endpoints (per-user rate limiting)
router.get('/download-data', 
  rateLimitAuthEndpoint({ windowMs: 24 * 60 * 60 * 1000, max: 3 }), 
  asyncHandler(AccountController.downloadData)
)

// For public endpoints (IP-based rate limiting)
router.post('/create', 
  rateLimitEndpoint({ windowMs: 10 * 60 * 1000, max: 3 }), 
  asyncHandler(AccountController.create)
)
```

### Error Handling

```typescript
// Use asyncHandler to catch errors automatically
import { asyncHandler } from '../lib/asyncHandler'

router.get('/:id', asyncHandler(async (req, res) => {
  // Errors here are caught and passed to error middleware
  const result = await riskyOperation()
  res.json(result)
}))
```

### Environment Validation

See `apps/api/src/lib/startup/validation.ts` for environment variable validation patterns.

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
