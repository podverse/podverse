# Add by RSS Item Index Refactor

## Overview

Refactor the Add by RSS episode indexing system to properly align with RSS semantics and support both episodes (podcast medium) and tracks (music medium) using a unified items index.

## Current State

- `episodeIndex.ts` only indexes items from podcast-medium channels
- `AddByRSSEpisodeIndexItem` type doesn't include medium information
- Episodes and tracks are treated as separate concepts despite both being RSS `<item>` tags
- The `/add-by-rss/tracks` page shows entire feeds (albums) rather than individual track items
- Medium filtering is duplicated across multiple files with inconsistent implementations

## Goals

1. Rename `episodeIndex` to `itemIndex` to align with RSS `<item>` semantics
2. Add `mediumId` to indexed items for filtering
3. Unify episodes and tracks as "items" distinguished by medium
4. Enable `/add-by-rss/tracks` to show individual track items (like episodes page)
5. Consolidate medium filtering helpers into a shared location

## RSS to Podverse Mapping

```
RSS Structure              Podverse UI
-----------              -----------
<channel medium="podcast"> → Podcast
  <item>                   → Episode

<channel medium="music">   → Album
  <item>                   → Track

<channel medium="publisher:music"> → Artist
  (items vary)
```

## Sub-Plans

| Plan | Description | Dependencies |
|------|-------------|--------------|
| [01-immediate-fix.md](01-immediate-fix.md) | Fix missing episode ID bug | None |
| [02-rename-episode-to-item.md](02-rename-episode-to-item.md) | Rename types, files, functions | 01 |
| [03-add-medium-support.md](03-add-medium-support.md) | Add mediumId to indexed items | 02 |
| [04-unify-tracks-page.md](04-unify-tracks-page.md) | Make tracks page show items | 03 |
| [05-consolidate-medium-helpers.md](05-consolidate-medium-helpers.md) | DRY up medium filtering | 03 |

## Execution Order

Execute plans sequentially in order (01 → 02 → 03 → 04 → 05).

Plan 01 is an immediate bug fix that can be deployed independently.
Plans 02-05 are the full architectural refactor.

## Files Affected

### Utility Files
- `apps/web/src/utils/addByRSS/episodeIndex.ts` → `itemIndex.ts`
- `apps/web/src/utils/addByRSS/episodePath.ts` → `itemPath.ts`
- `apps/web/src/utils/addByRSS/types.ts`
- `apps/web/src/utils/addByRSS/storage.ts`
- `apps/web/src/utils/addByRSS/resourceType.ts`

### Page Components
- `apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx`
- `apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx`
- `apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx`
- `apps/web/src/app/add-by-rss/tracks/` (new page client)

### UI Components
- `apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx`
- `apps/web/src/components/AddByRSS/Podcast/Episode/*.tsx`
- `apps/web/src/components/AddByRSS/Artist/Album/Track/*.tsx`

## IndexedDB Schema Changes

Current `EPISODES_STORE` will become `ITEMS_STORE` with schema:

```typescript
type AddByRSSItemIndexItem = {
  id: string;              // Composite: `${channelIdText}-${itemGuid}`
  idText: string;          // Nano ID for URLs
  itemGuid: string;
  channelIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  mediumId: number | null; // NEW: Channel's medium for filtering
  bundle: AddByRSSMappedFeed['items'][number];
  pubDateMs: number;
};
```

New index on `mediumId` for efficient filtering.
