# Migration 02F: API Queue Resource Controllers

## Overview

Refactor queue resource controllers to use shared Joi schemas and inline non-reusable schemas.

## Scope

**Files to modify:**

- `apps/api/src/controllers/queue/queueResource.ts`
- `apps/api/src/controllers/queue/queueResourceItem.ts`
- `apps/api/src/controllers/queue/queueResourceClip.ts`
- `apps/api/src/controllers/queue/queueResourceItemSoundbite.ts`
- `apps/api/src/controllers/queue/queueResourceItemAddByRSS.ts`

## Queue Resource (`queueResource.ts`)

### Replace with shared imports

- `queueIdSchema` → `queueIdTextParamSchema`

## Queue Resource Item (`queueResourceItem.ts`)

### Replace with shared imports

- `queueAndItemIdSchema` → combine `queueIdTextParamSchema` +
  `itemIdTextParamSchema` inline
- `addItemToQueueBetweenSchema` → `positionBetweenBodySchema`

### Inline-only schemas

- `queueResourceNowPlayingSchema` (keep inline or existing export)

## Queue Resource Clip (`queueResourceClip.ts`)

### Replace with shared imports

- `queueAndClipIdSchema` → combine `queueIdTextParamSchema` +
  `clipIdTextParamSchema` inline
- `addClipToQueueBetweenSchema` → `positionBetweenBodySchema`

## Queue Resource Item Soundbite (`queueResourceItemSoundbite.ts`)

### Replace with shared imports

- `queueAndSoundbiteIdSchema` → combine `queueIdTextParamSchema` +
  `itemSoundbiteIdTextParamSchema` inline
- `addItemSoundbiteToQueueBetweenSchema` → `positionBetweenBodySchema`

## Queue Resource Item Add By RSS (`queueResourceItemAddByRSS.ts`)

### Replace with shared imports

- `queueIdSchema` → `queueIdTextParamSchema`
- `addItemToQueueBetweenSchema` → inline with `positionBetweenBodySchema` plus
  `add_by_rss_resource_data`

### Inline-only schemas

- `addItemToQueueSchema` (add_by_rss_resource_data only)
- `queueAndRSSHashIdSchema` (queue + add_by_rss_hash_id)

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
