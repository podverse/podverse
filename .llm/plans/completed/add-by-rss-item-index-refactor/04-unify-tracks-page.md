# Plan 04: Unify Tracks Page with Items Index

## Overview

Currently `/add-by-rss/tracks` shows entire album feeds as "tracks". This plan updates it to show individual track items from album feeds, similar to how `/add-by-rss/episodes` shows individual episode items.

## Current vs Target Behavior

### Current
- `/add-by-rss/episodes` → Shows individual episode items (from podcast feeds)
- `/add-by-rss/tracks` → Shows album feeds (not individual tracks)

### Target
- `/add-by-rss/episodes` → Shows individual episode items (mediumFilter='podcast')
- `/add-by-rss/tracks` → Shows individual track items (mediumFilter='music')

## Changes

### 1. Update AddByRSSListClient.tsx

Currently `resourceType === 'episodes'` triggers item indexing. Extend to also handle `tracks`:

```typescript
useEffect(() => {
  if (resourceType === 'episodes' || resourceType === 'tracks') {
    const init = async () => {
      await buildAddByRSSItemsIndex(feeds);
      const map = await buildItemIdTextMap();
      setItemIdTextMap(map);
    };
    void init();
  }
}, [resourceType, feeds]);
```

Update `renderFeeds` to use items index for tracks:

```typescript
const renderFeeds = () => {
  switch (resourceType) {
    case 'episodes':
      return (
        <AddByRSSItemNodes
          feeds={feeds}
          viewSelected={viewSelected}
          itemIdTextMap={itemIdTextMap}
          mediumFilter="podcast"
          itemType="episode"
        />
      );
    case 'tracks':
      return (
        <AddByRSSItemNodes
          feeds={feeds}
          viewSelected={viewSelected}
          itemIdTextMap={itemIdTextMap}
          mediumFilter="music"
          itemType="track"
        />
      );
    // ... other cases
  }
};
```

### 2. Update AddByRSSEpisodeNodes → AddByRSSItemNodes

Rename and generalize to handle both episodes and tracks:

```typescript
// Rename file: AddByRSSEpisodeNodes.tsx → AddByRSSItemNodes.tsx

type AddByRSSItemNodesProps = {
  feeds: AddByRSSFeedRecord[];
  viewSelected: ViewSelectedOption;
  itemIdTextMap?: Map<string, string>;
  mediumFilter: 'podcast' | 'music' | 'all';
  itemType: 'episode' | 'track';  // For URL generation
};

export const AddByRSSItemNodes: React.FC<AddByRSSItemNodesProps> = ({
  feeds,
  viewSelected,
  itemIdTextMap,
  mediumFilter,
  itemType,
}) => {
  // Filter feeds by medium
  const filteredFeeds = feeds.filter(feed => {
    const mediumId = feed.mappedFeed?.channel?.channel?.medium_id ?? null;
    return matchesMediumFilter(mediumId, mediumFilter);
  });

  // Render items using appropriate row/grid component
  // Pass itemType for URL generation
};
```

### 3. Create Unified Item Row/Grid Components

Either:

**Option A**: Update `AddByRSSEpisodeRow` to accept `itemType` prop:

```typescript
type AddByRSSItemRowProps = {
  itemIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  bundle: AddByRSSMappedFeed['items'][number];
  itemType: 'episode' | 'track';  // For URL and styling
};

export const AddByRSSItemRow: React.FC<AddByRSSItemRowProps> = ({
  itemIdText,
  channelTitle,
  channelImageUrl,
  bundle,
  itemType,
}) => {
  const url = getAddByRSSItemPath(itemIdText, itemType === 'track' ? 'tracks' : 'episodes');
  // Use episode or track styles based on itemType
};
```

**Option B**: Keep separate components but share logic via a base component or hook.

Recommendation: Option A for simplicity, with the existing episode components serving as the base.

### 4. Update itemPath.ts

```typescript
export const getAddByRSSItemPath = (
  idText: string,
  resourceType: 'episodes' | 'tracks' = 'episodes'
): string => {
  const segment = resourceType === 'tracks' ? 'track' : 'episode';
  return `/add-by-rss/${segment}/${idText}`;
};
```

### 5. Create Track Detail Page Client (if needed)

Currently tracks link to `/add-by-rss/track/[id]` which shows the feed detail. If we want to show individual track items, we need:

```typescript
// apps/web/src/app/add-by-rss/track/[id]/page.tsx
// Similar to episode detail page but for tracks
```

Or reuse the episode detail page with a shared item detail client.

## File Renames (Component Level)

Consider renaming episode components to item components:

| Current | New |
|---------|-----|
| `AddByRSSEpisodeNodes.tsx` | `AddByRSSItemNodes.tsx` |
| `AddByRSSEpisodeRow.tsx` | `AddByRSSItemRow.tsx` |
| `AddByRSSEpisodeGridItem.tsx` | `AddByRSSItemGridItem.tsx` |
| `AddByRSSEpisodesListNodes.tsx` | `AddByRSSItemsListNodes.tsx` |

Or keep episode-specific naming and create track-specific wrappers that reuse the logic.

## Verification

1. `/add-by-rss/tracks` shows individual track items from music-medium feeds
2. Track items link to `/add-by-rss/track/{itemIdText}`
3. Track detail page loads correctly
4. Pagination works for tracks list
5. Episode functionality unchanged
