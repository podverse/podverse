# Migration 02D: API Playlist Resource Controllers

## Overview

Refactor playlist resource controllers to use shared Joi schemas and inline non-reusable schemas.

## Scope

**Files to modify:**

- `apps/api/src/controllers/playlist/playlistResource.ts`
- `apps/api/src/controllers/playlist/playlistResourceItem.ts`
- `apps/api/src/controllers/playlist/playlistResourceClip.ts`
- `apps/api/src/controllers/playlist/playlistResourceItemSoundbite.ts`
- `apps/api/src/controllers/playlist/playlistResourceItemAddByRSS.ts`

## Playlist Resource (`playlistResource.ts`)

### Replace with shared imports

- `playlistIdSchema` → `playlistIdTextParamSchema`
- `getManyForQueueByListPositionParamsSchema` → `playlistIdTextParamSchema`
- `getManyByPlaylistShuffleParamsSchema` → `playlistIdTextParamSchema`
- `getManyByPlaylistShuffleQuerySchema` → inline, but use `pageDefaultQuerySchema`

### Inline-only schemas

- `getManyForQueueByListPositionQuerySchema`

## Playlist Resource Item (`playlistResourceItem.ts`)

### Replace with shared imports

- `playlistAndItemIdSchema` → combine `playlistIdTextParamSchema` +
  `itemIdTextParamSchema` inline
- `addItemToPlaylistBetweenSchema` → `positionBetweenBodySchema`

## Playlist Resource Clip (`playlistResourceClip.ts`)

### Replace with shared imports

- `playlistAndClipIdSchema` → combine `playlistIdTextParamSchema` +
  `clipIdTextParamSchema` inline
- `addClipToPlaylistBetweenSchema` → `positionBetweenBodySchema`

## Playlist Resource Item Soundbite (`playlistResourceItemSoundbite.ts`)

### Replace with shared imports

- `playlistAndSoundbiteIdSchema` → combine `playlistIdTextParamSchema` +
  `itemSoundbiteIdTextParamSchema` inline
- `addItemSoundbiteToPlaylistBetweenSchema` → `positionBetweenBodySchema`

## Playlist Resource Item Add By RSS (`playlistResourceItemAddByRSS.ts`)

### Replace with shared imports

- `playlistIdSchema` → `playlistIdTextParamSchema`
- `addItemToPlaylistBetweenSchema` → inline with `positionBetweenBodySchema` plus
  `add_by_rss_resource_data`

### Inline-only schemas

- `addItemToPlaylistSchema` (add_by_rss_resource_data only)
- `playlistAndRSSHashIdSchema` (playlist + add_by_rss_hash_id)

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
