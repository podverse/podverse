# Phase 13: Skills Migration

**Status**: Planned

## Overview

Migrate existing Cursor skills from podverse-web to the monorepo and create new monorepo-specific skills.

## Source Skills

**Location**: `podverse-web/.cursor/skills/podverse-web-patterns/`

| File | Lines | Content |
|------|-------|---------|
| `SKILL.md` | ~90 | Index and overview |
| `01-component-patterns.md` | ~300 | Pages, components, modals, lists |
| `02-api-data-fetching.md` | ~200 | API calls, SSR, error handling |
| `03-styling.md` | ~150 | SCSS modules patterns |
| `04-configuration.md` | ~200 | Env vars, constants, config |
| `05-code-quality.md` | ~180 | Error handling, types, translations |
| `06-development-workflow.md` | ~150 | Plan mode, agent mode |
| `07-reusable-utilities.md` | ~100 | When to use helpers |
| `08-best-practices.md` | ~120 | Checklist, critical requirements |
| `09-performance-optimization.md` | ~650 | Code splitting, memoization, etc. |

## Target Structure

```
.cursor/
  skills/
    global/
      SKILL.md              # Already exists (from Phase 1)
    web/
      SKILL.md              # Index
      01-component-patterns.md
      02-api-data-fetching.md
      03-styling.md
      04-configuration.md
      05-code-quality.md
      06-development-workflow.md
      07-reusable-utilities.md
      08-best-practices.md
      09-performance-optimization.md
    api/
      SKILL.md              # New - API patterns
    orm/
      SKILL.md              # New - ORM patterns
```

## Migration Tasks

### 1. Copy Web Skills

```bash
mkdir -p .cursor/skills/web
cp -r podverse-web/.cursor/skills/podverse-web-patterns/* .cursor/skills/web/
```

### 2. Update Import Paths

Find and replace in all web skill files:

| Before | After |
|--------|-------|
| `podverse-helpers` | `@podverse/helpers` |
| `podverse-web/src/` | `apps/web/src/` |
| `../../../src/` | `apps/web/src/` |

### 3. Update SKILL.md Index

```markdown
---
name: podverse-web-patterns
description: Common patterns for the podverse-web Next.js application
version: 1.0.0
---

# Podverse Web Development Patterns

This skill provides quick reference for common patterns used in the podverse-web application (`apps/web/`).

## Monorepo Context

- Web app location: `apps/web/`
- Shared helpers: `@podverse/helpers` (from `packages/helpers/`)
- API client: Uses `@podverse/helpers` DTOs

## Table of Contents
...
```

### 4. Update File Path References

In each skill file, update examples:

**Before:**
```typescript
// src/components/Example.tsx
import { Episode } from 'podverse-helpers'
```

**After:**
```typescript
// apps/web/src/components/Example.tsx
import { Episode } from '@podverse/helpers'
```

## New Skills to Create

### API Skill

**File**: `.cursor/skills/api/SKILL.md`

```markdown
---
name: podverse-api-patterns
description: Common patterns for the podverse-api Express application
version: 1.0.0
---

# Podverse API Development Patterns

## Location

`apps/api/`

## Key Dependencies

- `@podverse/helpers` - Types and DTOs
- `@podverse/orm` - Database entities
- `@podverse/mq` - Message queue operations
- `@podverse/parser` - Feed parsing

## Patterns

### Route Definition

```typescript
// apps/api/src/routes/podcast.ts
import { Router } from 'express'
import { PodcastController } from '../controllers/podcast'

const router = Router()
router.get('/:id', PodcastController.getById)
export default router
```

### Controller Pattern

```typescript
// apps/api/src/controllers/podcast.ts
import { Request, Response } from 'express'
import { PodcastService } from '@podverse/orm'

export const PodcastController = {
  async getById(req: Request, res: Response) {
    try {
      const { id } = req.params
      const podcast = await PodcastService.getById(id)
      res.json(podcast)
    } catch (error) {
      res.status(500).json({ error: 'Internal server error' })
    }
  }
}
```

### Environment Validation

See `apps/api/src/lib/startup/validation.ts`
```

### ORM Skill

**File**: `.cursor/skills/orm/SKILL.md`

```markdown
---
name: podverse-orm-patterns
description: Common patterns for the podverse-orm package
version: 1.0.0
---

# Podverse ORM Development Patterns

## Location

`packages/orm/`

## Key Dependencies

- `@podverse/helpers` - Types and DTOs
- `typeorm` - ORM framework

## Patterns

### Entity Definition

```typescript
// packages/orm/src/entities/Podcast.ts
import { Entity, PrimaryGeneratedColumn, Column, OneToMany } from 'typeorm'
import { Episode } from './Episode'

@Entity('podcast')
export class Podcast {
  @PrimaryGeneratedColumn('uuid')
  id: string

  @Column()
  title: string

  @Column({ nullable: true })
  description?: string

  @OneToMany(() => Episode, (episode) => episode.podcast)
  episodes: Episode[]
}
```

### Service Pattern

```typescript
// packages/orm/src/services/PodcastService.ts
import { getRepository } from 'typeorm'
import { Podcast } from '../entities/Podcast'

export const PodcastService = {
  async getById(id: string): Promise<Podcast | null> {
    const repo = getRepository(Podcast)
    return repo.findOne({ where: { id } })
  },

  async getByFeedUrl(feedUrl: string): Promise<Podcast | null> {
    const repo = getRepository(Podcast)
    return repo.findOne({ where: { feedUrl } })
  }
}
```

### Migration

See `infra/database/main/migrations/` for migration files.
```

## Global Skill Updates

Update `.cursor/skills/global/SKILL.md` to reference other skills:

```markdown
## Related Skills

- **[Web Patterns](.cursor/skills/web/SKILL.md)** - Next.js app patterns
- **[API Patterns](.cursor/skills/api/SKILL.md)** - Express API patterns
- **[ORM Patterns](.cursor/skills/orm/SKILL.md)** - Database patterns
```

## Specific Updates Required

### 01-component-patterns.md

- Update import examples to use `@podverse/helpers`
- Update file paths from `src/` to `apps/web/src/`

### 04-configuration.md

- Reference monorepo env strategy (Phase 7)
- Update env file locations

### 06-development-workflow.md

- Add monorepo-specific workflows
- Reference `npm run dev:web` instead of `npm run dev`

### 07-reusable-utilities.md

- Update path to `packages/helpers/`
- Clarify workspace dependency

## Skills for Future Phases

These skills can be created after the respective phases complete:

| Skill | Phase | Content |
|-------|-------|---------|
| `packages/` | Phase 2 | Package development patterns |
| `workers/` | Phase 3 | Background job patterns |
| `infra/` | Phase 4 | Infrastructure patterns |

## Migration Checklist

- [ ] Create `.cursor/skills/web/` directory
- [ ] Copy all files from podverse-web skills
- [ ] Update imports in all files (`podverse-helpers` → `@podverse/helpers`)
- [ ] Update file paths in all files
- [ ] Update SKILL.md index with monorepo context
- [ ] Create `.cursor/skills/api/SKILL.md`
- [ ] Create `.cursor/skills/orm/SKILL.md`
- [ ] Update `.cursor/skills/global/SKILL.md` with cross-references
- [ ] Test skills work in Cursor

## Files to Create

| File | Source |
|------|--------|
| `.cursor/skills/web/*` | Copy from podverse-web |
| `.cursor/skills/api/SKILL.md` | New |
| `.cursor/skills/orm/SKILL.md` | New |

## Estimated Effort

~3-4 hours (includes path updates and testing)
