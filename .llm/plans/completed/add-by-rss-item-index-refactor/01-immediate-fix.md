# Plan 01: Immediate Bug Fix - Missing Episode IDs

## Problem

Episode links on podcast detail pages render as `/add-by-rss/episode/` (missing the ID) because:

1. `buildItemIdTextMap()` reads from IndexedDB
2. IndexedDB episodes store is empty after DB upgrade to v3
3. The episodes index is only built on `/add-by-rss/episodes`, not on podcast detail pages

## Solution

Ensure the items index is built before building the ID map in all consumers.

## Changes

### 1. AddByRSSPodcastPageDetailClient.tsx (ALREADY DONE)

```typescript
// apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx

// Import buildAddByRSSEpisodesIndex
import { buildAddByRSSEpisodesIndex, buildItemIdTextMap } from '../../../utils/addByRSS/episodeIndex';

// Update useEffect
useEffect(() => {
  const init = async () => {
    await buildAddByRSSEpisodesIndex([localFeed]);
    const map = await buildItemIdTextMap();
    setItemIdTextMap(map);
  };
  void init();
}, [localFeed]);
```

### 2. AddByRSSListClient.tsx (NEEDS FIX)

```typescript
// apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx

// Import buildAddByRSSEpisodesIndex  
import { buildAddByRSSEpisodesIndex, buildItemIdTextMap } from '../../../utils/addByRSS/episodeIndex';

// Update useEffect (around line 211-215)
useEffect(() => {
  if (resourceType === 'episodes') {
    const init = async () => {
      await buildAddByRSSEpisodesIndex(feeds);
      const map = await buildItemIdTextMap();
      setItemIdTextMap(map);
    };
    void init();
  }
}, [resourceType, feeds]);
```

## Verification

1. Navigate to `/add-by-rss/podcast/{id}`
2. Episode links should have IDs: `/add-by-rss/episode/{itemIdText}`
3. Navigate to `/add-by-rss/episodes`
4. Episode links should have IDs

## Status

- [x] AddByRSSPodcastPageDetailClient - Fixed
- [ ] AddByRSSListClient - Pending
