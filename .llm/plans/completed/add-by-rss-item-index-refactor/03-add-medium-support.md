# Plan 03: Add Medium Support to Items Index

## Overview

Add `mediumId` to indexed items so episodes and tracks can be distinguished and filtered by medium.

## Type Changes

### Update AddByRSSItemIndexItem in types.ts

```typescript
export type AddByRSSItemIndexItem = {
  id: string;
  idText: string;
  itemGuid: string;
  channelIdText: string;
  channelTitle: string;
  channelImageUrl?: string;
  mediumId: number | null;  // NEW FIELD
  bundle: AddByRSSMappedFeed['items'][number];
  pubDateMs: number;
};
```

## IndexedDB Schema Changes

### In storage.ts

1. Bump `DB_VERSION` to 5 (or consolidate with plan 02)
2. Add `mediumId` index to `ITEMS_STORE`

```typescript
// In onupgradeneeded handler
if (!db.objectStoreNames.contains(ITEMS_STORE)) {
  const store = db.createObjectStore(ITEMS_STORE, { keyPath: 'id' });
  store.createIndex('pubDateMs', 'pubDateMs', { unique: false });
  store.createIndex('itemGuid', 'itemGuid', { unique: false });
  store.createIndex('idText', 'idText', { unique: true });
  store.createIndex('mediumId', 'mediumId', { unique: false }); // NEW
}
```

### Add Medium-Filtered Query Functions

```typescript
export const getAddByRSSItemsIndexPageByMedium = async (params: {
  sort: 'recent' | 'oldest';
  page: number;
  pageSize: number;
  mediumFilter: 'podcast' | 'music' | 'all';
}): Promise<{ items: AddByRSSItemIndexItem[]; totalCount: number }> => {
  // Filter by mediumId based on mediumFilter
  // 'podcast' = MediumEnum.Podcast, Video, PodcastL, VideoL, PublisherPodcast, PublisherVideo
  // 'music' = MediumEnum.Music, MusicL
  // 'all' = no filter
};
```

## Update itemIndex.ts

### Modify toIndexItem to Include Medium

```typescript
const toIndexItem = (
  feed: AddByRSSFeedRecord,
  bundle: AddByRSSMappedFeed['items'][number],
  fallbackId: number,
  existingIdText?: string
): AddByRSSItemIndexItem => {
  const itemGuid = bundle.item.guid ?? `${feed.idText}-${fallbackId}`;
  const pubDateMs = bundle.item.pub_date ? new Date(bundle.item.pub_date).getTime() : 0;
  const idText = existingIdText ?? createAddByRSSIdText();
  const mediumId = getFeedMedium(feed);  // Get medium from channel

  return {
    id: `${feed.idText}-${itemGuid}`,
    idText,
    itemGuid,
    channelIdText: feed.idText,
    channelTitle: getChannelTitle(feed),
    channelImageUrl: getChannelImageUrl(feed),
    mediumId,  // NEW
    bundle,
    pubDateMs,
  };
};
```

### Remove isPodcastMedium Filter from buildAddByRSSItemsIndex

Currently the index only includes podcast-medium items. Remove this filter to include ALL items:

```typescript
// Before
for (const feed of feeds) {
  const medium = getFeedMedium(feed);
  if (!isPodcastMedium(medium)) {
    continue;  // REMOVE THIS
  }
  // ...
}

// After
for (const feed of feeds) {
  const feedItems = feed.mappedFeed?.items ?? [];
  feedItems.forEach((bundle, index) => {
    // Index ALL items regardless of medium
    items.push(toIndexItem(feed, bundle, index, existingIdText));
  });
}
```

### Add Medium Filter to Query Functions

```typescript
export const getAddByRSSItemsIndexPageOrEmpty = async (params: {
  sort: 'recent' | 'oldest';
  page: number;
  pageSize: number;
  mediumFilter?: 'podcast' | 'music' | 'all';  // NEW optional param
}) => {
  // Pass filter to storage query
};

export const getFastAddByRSSItemsPage = (params: {
  feeds: AddByRSSFeedRecord[];
  sort: 'recent' | 'oldest';
  pageSize: number;
  mediumFilter?: 'podcast' | 'music' | 'all';  // NEW optional param
}): AddByRSSItemIndexItem[] => {
  // Filter items by medium before returning
};
```

## Medium Filter Helper

Create or export a shared helper:

```typescript
// In resourceType.ts or a new mediumHelpers.ts
export const isPodcastMediumId = (mediumId: number | null): boolean =>
  mediumId === null ||
  mediumId === MediumEnum.Podcast ||
  mediumId === MediumEnum.Video ||
  mediumId === MediumEnum.PodcastL ||
  mediumId === MediumEnum.VideoL ||
  mediumId === MediumEnum.PublisherPodcast ||
  mediumId === MediumEnum.PublisherVideo;

export const isMusicMediumId = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Music ||
  mediumId === MediumEnum.MusicL;

export const matchesMediumFilter = (
  mediumId: number | null,
  filter: 'podcast' | 'music' | 'all'
): boolean => {
  if (filter === 'all') return true;
  if (filter === 'podcast') return isPodcastMediumId(mediumId);
  if (filter === 'music') return isMusicMediumId(mediumId);
  return false;
};
```

## Verification

1. Items from both podcast and music feeds are indexed
2. Episodes page filters to podcast-medium items
3. Tracks page filters to music-medium items
4. Medium is correctly stored in IndexedDB
