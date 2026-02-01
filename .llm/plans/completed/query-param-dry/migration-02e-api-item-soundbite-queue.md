# Migration 02E: API Item Soundbite + Queue

## Overview

Refactor `itemSoundbite.ts` and `queue.ts` to use shared Joi schemas and inline others.

## Scope

**Files to modify:**

- `apps/api/src/controllers/itemSoundbite.ts`
- `apps/api/src/controllers/queue/queue.ts`

## Item Soundbite Controller (`itemSoundbite.ts`)

### Replace with shared imports

- `itemSoundbiteIdTextSchema` → `itemSoundbiteIdTextParamSchema`
- `getByChannelIdTextSchema` → `channelIdTextParamSchema`
- `getByItemIdTextSchema` → `itemIdTextParamSchema`

### Inline-only schemas

- `getItemSoundbitesByChannelIdTextSchema` (page + sort)
- `getItemSoundbitesByItemIdTextSchema` (page + sort)

## Queue Controller (`queue.ts`)

### Replace with shared imports

- `queueIdTextParamsSchema` → `queueIdTextParamSchema`

### Inline-only schemas

- `updateIsActiveQueueSchema`

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
