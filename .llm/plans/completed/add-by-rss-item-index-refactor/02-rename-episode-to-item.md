# Plan 02: Rename Episode to Item

## Overview

Rename all "episode"-specific naming to "item" to align with RSS `<item>` semantics. Episodes and tracks are both items - the difference is the channel's medium.

## File Renames

| Current | New |
|---------|-----|
| `episodeIndex.ts` | `itemIndex.ts` |
| `episodePath.ts` | `itemPath.ts` |

## Type Renames

### In `types.ts`

```typescript
// Before
export type AddByRSSEpisodeIndexItem = { ... };

// After
export type AddByRSSItemIndexItem = { ... };
```

## Function Renames in itemIndex.ts

| Current | New |
|---------|-----|
| `buildAddByRSSEpisodesIndex` | `buildAddByRSSItemsIndex` |
| `getAddByRSSEpisodesIndexInfo` | `getAddByRSSItemsIndexInfo` |
| `getAddByRSSEpisodesIndexPageOrEmpty` | `getAddByRSSItemsIndexPageOrEmpty` |
| `getFastAddByRSSEpisodesPage` | `getFastAddByRSSItemsPage` |
| `findAddByRSSEpisodeByGuid` | `findAddByRSSItemByGuid` |
| `ADD_BY_RSS_EPISODES_PAGE_SIZE` | `ADD_BY_RSS_ITEMS_PAGE_SIZE` |

## Function Renames in storage.ts

| Current | New |
|---------|-----|
| `getAllAddByRSSEpisodes` | `getAllAddByRSSItems` |
| `bulkUpsertAddByRSSEpisodesIndexItems` | `bulkUpsertAddByRSSItemsIndexItems` |
| `clearAddByRSSEpisodesIndex` | `clearAddByRSSItemsIndex` |
| `getAddByRSSEpisodesIndexCount` | `getAddByRSSItemsIndexCount` |
| `getAddByRSSEpisodesIndexPage` | `getAddByRSSItemsIndexPage` |
| `getAddByRSSEpisodesIndexMeta` | `getAddByRSSItemsIndexMeta` |
| `setAddByRSSEpisodesIndexMeta` | `setAddByRSSItemsIndexMeta` |
| `getAddByRSSEpisodeByGuid` | `getAddByRSSItemByGuid` |
| `getAddByRSSEpisodeByIdText` | `getAddByRSSItemByIdText` |
| `getAddByRSSEpisodeById` | `getAddByRSSItemById` |

## Function Renames in itemPath.ts

| Current | New |
|---------|-----|
| `getAddByRSSEpisodePath` | `getAddByRSSItemPath` |

Note: The path function should accept a `resourceType` parameter to generate the correct URL segment (`/episode/` vs `/track/`).

```typescript
// itemPath.ts
export const getAddByRSSItemPath = (
  idText: string, 
  resourceType: 'episodes' | 'tracks' = 'episodes'
): string => {
  const segment = resourceType === 'tracks' ? 'track' : 'episode';
  return `/add-by-rss/${segment}/${idText}`;
};
```

## IndexedDB Constants in storage.ts

| Current | New |
|---------|-----|
| `EPISODES_STORE` | `ITEMS_STORE` |
| `EPISODES_META_STORE` | `ITEMS_META_STORE` |

**Important**: Bump `DB_VERSION` to 4 and handle migration (delete old stores, create new ones).

## Update All Import Statements

Search and replace across all consumers:

```bash
# Files to update imports in:
apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx
apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx
apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes.tsx
apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx
apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridItem.tsx
apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes.tsx
apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx
```

## Verification

1. TypeScript compiles with no errors
2. All existing episode functionality works unchanged
3. IndexedDB migrates cleanly (items are re-indexed on first visit)
