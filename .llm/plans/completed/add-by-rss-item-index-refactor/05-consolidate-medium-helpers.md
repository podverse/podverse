# Plan 05: Consolidate Medium Helpers

## Overview

Medium filtering logic is currently duplicated across multiple files with inconsistent implementations. This plan consolidates them into a single shared location.

## Current Duplication

### In episodeIndex.ts (now itemIndex.ts)
```typescript
const isPodcastMedium = (mediumId?: number | null) =>
  mediumId === null ||
  typeof mediumId === 'undefined' ||
  mediumId === MediumEnum.Podcast ||
  mediumId === MediumEnum.Video ||
  mediumId === MediumEnum.PodcastL ||
  mediumId === MediumEnum.VideoL ||
  mediumId === MediumEnum.PublisherPodcast ||
  mediumId === MediumEnum.PublisherVideo;
```

### In resourceType.ts
```typescript
const isPodcastMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Podcast ||
  mediumId === MediumEnum.PodcastL ||
  mediumId === MediumEnum.PublisherPodcast ||
  mediumId === MediumEnum.Video ||
  mediumId === MediumEnum.VideoL ||
  mediumId === MediumEnum.PublisherVideo ||
  mediumId === MediumEnum.PublisherAV;  // Different!

const isAlbumMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Music || mediumId === MediumEnum.MusicL;

const isArtistMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.PublisherMusic;
```

### In AddByRSSArtistPageClient.tsx & AddByRSSArtistsPageClient.tsx
```typescript
const isMusicMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Music ||
  mediumId === MediumEnum.MusicL ||
  mediumId === MediumEnum.PublisherMusic;  // Different from isAlbumMedium!
```

## Issues

1. `isPodcastMedium` in episodeIndex includes `null`/`undefined` as podcast; resourceType doesn't
2. `isPodcastMedium` in resourceType includes `PublisherAV`; episodeIndex doesn't
3. `isMusicMedium` in artist pages includes `PublisherMusic`; `isAlbumMedium` doesn't
4. No shared `isMusicMedium` or `isTrackMedium` helper

## Solution

Create a new file `apps/web/src/utils/addByRSS/mediumHelpers.ts` with canonical implementations:

```typescript
import { MediumEnum } from '@podverse/helpers';

/**
 * Medium helpers for Add by RSS functionality.
 * 
 * RSS Channel Mediums:
 * - Podcast/Video: Episodes
 * - Music/MusicL: Albums (tracks are items within)
 * - PublisherMusic: Artists
 * - PublisherPodcast/PublisherVideo: Podcast publishers
 */

// Podcast mediums (for episodes)
const PODCAST_MEDIUMS = new Set([
  MediumEnum.Podcast,
  MediumEnum.PodcastL,
  MediumEnum.Video,
  MediumEnum.VideoL,
  MediumEnum.PublisherPodcast,
  MediumEnum.PublisherVideo,
  MediumEnum.PublisherAV,
]);

// Music mediums (for tracks)
const MUSIC_MEDIUMS = new Set([
  MediumEnum.Music,
  MediumEnum.MusicL,
]);

// Artist mediums
const ARTIST_MEDIUMS = new Set([
  MediumEnum.PublisherMusic,
]);

/**
 * Check if medium is podcast-type (channel contains episodes).
 * null/undefined defaults to podcast for backwards compatibility.
 */
export const isPodcastMedium = (mediumId: number | null | undefined): boolean =>
  mediumId === null || mediumId === undefined || PODCAST_MEDIUMS.has(mediumId);

/**
 * Check if medium is music-type (channel contains tracks).
 */
export const isMusicMedium = (mediumId: number | null | undefined): boolean =>
  mediumId !== null && mediumId !== undefined && MUSIC_MEDIUMS.has(mediumId);

/**
 * Check if medium is album-type (Music/MusicL specifically).
 */
export const isAlbumMedium = (mediumId: number | null | undefined): boolean =>
  isMusicMedium(mediumId);

/**
 * Check if medium is artist-type (PublisherMusic).
 */
export const isArtistMedium = (mediumId: number | null | undefined): boolean =>
  mediumId !== null && mediumId !== undefined && ARTIST_MEDIUMS.has(mediumId);

/**
 * Check if medium matches a filter category.
 */
export const matchesMediumFilter = (
  mediumId: number | null | undefined,
  filter: 'podcast' | 'music' | 'all'
): boolean => {
  if (filter === 'all') return true;
  if (filter === 'podcast') return isPodcastMedium(mediumId);
  if (filter === 'music') return isMusicMedium(mediumId);
  return false;
};

/**
 * Get the item type (episode/track) based on channel medium.
 */
export const getItemTypeFromMedium = (
  mediumId: number | null | undefined
): 'episode' | 'track' => {
  return isMusicMedium(mediumId) ? 'track' : 'episode';
};
```

## Migration Steps

### 1. Create mediumHelpers.ts
Create the new file with consolidated implementations.

### 2. Update resourceType.ts
Remove local helpers, import from mediumHelpers:

```typescript
import { isPodcastMedium, isAlbumMedium, isArtistMedium } from './mediumHelpers';

// Remove local isPodcastMedium, isAlbumMedium, isArtistMedium definitions
```

### 3. Update itemIndex.ts (formerly episodeIndex.ts)
Remove local isPodcastMedium, import from mediumHelpers:

```typescript
import { isPodcastMedium, isMusicMedium, matchesMediumFilter } from './mediumHelpers';

// Remove local isPodcastMedium definition
```

### 4. Update AddByRSSArtistPageClient.tsx
Remove local isMusicMedium, import from mediumHelpers:

```typescript
import { isMusicMedium } from '../../../utils/addByRSS/mediumHelpers';

// Remove local isMusicMedium definition
```

### 5. Update AddByRSSArtistsPageClient.tsx
Same as above.

## Verification

1. All medium checks use consistent logic
2. TypeScript compiles with no errors
3. Podcast/episode filtering works correctly
4. Music/track filtering works correctly
5. Artist filtering works correctly
6. No duplicate medium helper definitions remain
