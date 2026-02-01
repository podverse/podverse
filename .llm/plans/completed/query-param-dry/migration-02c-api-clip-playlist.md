# Migration 02C: API Clip + Playlist Controllers

## Overview

Refactor `clip.ts` and `playlist.ts` to use shared Joi schemas and inline any non-reusable schemas.

## Scope

**Files to modify:**

- `apps/api/src/controllers/clip.ts`
- `apps/api/src/controllers/playlist/playlist.ts`

## Clip Controller (`clip.ts`)

### Replace with shared imports

- `clipIdSchema` → `clipIdTextParamSchema`
- `getByChannelIdTextSchema` → `channelIdTextParamSchema`
- `getByItemIdTextSchema` → `itemIdTextParamSchema`
- `getClipsPublicManyRecentSchema` → `mediumPageQuerySchema`
- `getClipsPublicManyOldestSchema` → `mediumPageQuerySchema`
- `getClipsPublicTopSchema` → `mediumPageRangeQuerySchema`
- `getClipsPublicManyCategoryRecentSchema` → `mediumCategoryPageQuerySchema`
- `getClipsPublicManyCategoryOldestSchema` → `mediumCategoryPageQuerySchema`
- `getClipsPublicManyCategoryTopSchema` → `mediumCategoryPageRangeQuerySchema`
- `getClipsPublicByChannelRecentSchema` → `pageQuerySchema`
- `getClipsPublicByChannelOldestSchema` → `pageQuerySchema`
- `getClipsPublicByChannelTopSchema` → `pageRangeQuerySchema`
- `getClipsPublicByItemRecentSchema` → `pageQuerySchema`
- `getClipsPublicByItemOldestSchema` → `pageQuerySchema`
- `getClipsPublicByItemTopSchema` → `pageRangeQuerySchema`
- `getManySubscribedRecentSchema` → `mediumPageQuerySchema`
- `getManySubscribedTopSchema` → `mediumPageRangeQuerySchema`

### Inline-only schemas

- `clipCreateSchema`
- `clipUpdateSchema`

## Playlist Controller (`playlist.ts`)

### Replace with shared imports

- `playlistIdSchema` → `playlistIdTextParamSchema`
- `getManyPublicTopSchema` → `mediumPageRangeQuerySchema`
- `getManyPrivateRecentSchema` → `mediumPageQuerySchema`
- `getManyPrivateOldestSchema` → `mediumPageQuerySchema`
- `getManyPrivateAZSchema` → `mediumPageQuerySchema`
- `getManyPrivateTopSchema` → `mediumPageRangeQuerySchema`
- `getManyPrivateFollowedTopSchema` → `mediumPageRangeQuerySchema`
- `getManyPrivateFollowedRecentSchema` → `mediumPageQuerySchema`
- `getManyPrivateFollowedOldestSchema` → `mediumPageQuerySchema`
- `getManyPrivateFollowedAZSchema` → `mediumPageQuerySchema`

### Inline-only schemas

- `createPlaylistSchema`
- `updatePlaylistSchema`

## Implementation Steps

1. Import shared schemas from `@api/lib/validation`.
2. Remove top-level schema constants that are now shared.
3. Move remaining schemas inline in controller methods.
4. Keep all Joi `valid(...)` arrays backed by shared query param constants.

## Verification

- [ ] Controllers compile without TypeScript errors.
- [ ] No top-level schema constants remain except shared helpers.
