# Migration 02B: API Channel + Item Controllers

## Overview

Refactor `channel.ts` and `item.ts` to use shared Joi schemas and move non-reusable schemas inline.

## Scope

**Files to modify:**

- `apps/api/src/controllers/channel.ts`
- `apps/api/src/controllers/item.ts`

## Channel Controller (`channel.ts`)

### Replace with shared imports

- `getByIdOrIdTextSchema` → `idOrIdTextParamSchema`
- `getManyGlobalRecentSchema` → `mediumPageQuerySchema`
- `getManyGlobalTopSchema` → `mediumPageRangeQuerySchema`
- `getManyCategoryRecentSchema` → `mediumCategoryPageQuerySchema`
- `getManyCategoryTopSchema` → `mediumCategoryPageRangeQuerySchema`
- `getManySubscribedAZSchema` → `mediumPageQuerySchema`
- `getManySubscribedRecentSchema` → `mediumPageQuerySchema`
- `getManySubscribedTopSchema` → `mediumPageRangeQuerySchema`

### Inline-only schemas

- `getByPodcastIndexIdSchema` (keep inline in the method)

## Item Controller (`item.ts`)

### Replace with shared imports

- `getByIdOrIdTextSchema` → `idOrIdTextParamSchema`
- `getManyGlobalRecentSchema` → `mediumPageQuerySchema` + inline `liveItemType`
- `getManyGlobalTopSchema` → `mediumPageRangeQuerySchema` + inline `liveItemType`
- `getManyCategoryRecentSchema` → `mediumCategoryPageQuerySchema` + inline `liveItemType`
- `getManyCategoryTopSchema` → `mediumCategoryPageRangeQuerySchema` + inline `liveItemType`
- `getManySubscribedRecentSchema` → `mediumPageQuerySchema` + inline `liveItemType`
- `getManySubscribedTopSchema` → `mediumPageRangeQuerySchema` + inline `liveItemType`
- `getManyByChannelQuerySchemaRecent` → `pageQuerySchema`
- `getManyByChannelQuerySchemaOldest` → `pageQuerySchema`
- `getManyByChannelBySeasonQuerySchema` → `pageQuerySchema`
- `getManyByChannelTopQuerySchema` → `pageRangeQuerySchema`
- `parseAndGetChaptersSchema` → `itemIdTextParamSchema`

### Inline-only schemas

- `getManyByChannelParmsSchema` (channelIdOrIdText field)
- `getManyByChannelShuffleQuerySchema` (page + shuffleHash)
- `getManyForQueueByPubDateParamsSchema` (idText key)
- `getManyForQueueBySeasonParamsSchema` (idText key)

### Inline but use shared constants

- `getManyForQueueByPubDateQuerySchema` → use `QUERY_PARAMS_DIRECTION_VALUES`
- `getManyForQueueBySeasonQuerySchema` → use `QUERY_PARAMS_DIRECTION_VALUES`

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
