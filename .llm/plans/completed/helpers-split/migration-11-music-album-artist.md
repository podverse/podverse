# Migration Part 11: Music - Albums & Artists

## Scope

Update QueryParams imports in album and artist page components.

## Files to Update (4)

### 1. `apps/web/src/app/album/[channel_id]/AlbumDropdownConfig.ts`

**Current**:

```typescript
import {
  QueryParamsStatsRange,
  QueryParamsChannelMusicAlbumSort,
  QueryParamsChannelMusicAlbumType,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  QueryParamsStatsRange,
  QueryParamsChannelMusicAlbumSort,
  QueryParamsChannelMusicAlbumType,
} from '@podverse/helpers-requests';
```

### 2. `apps/web/src/app/album/[channel_id]/AlbumClient.tsx` 🚨

**Current**:

```typescript
import {
  DTOChannel,
  DTOItem,
  QueryParamsChannelMusicAlbum,
  RemoteItemsResponse,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';
```

**Note**: This is the CRITICAL fix that's blocking the bundle analyzer.

### 3. `apps/web/src/app/artist/[channel_id]/ArtistClient.tsx`

**Current**:

```typescript
import {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  QueryParamsChannelMusicArtist,
  RemoteItemsResponse,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  DTOChannel,
  DTOItem,
  EpisodeByGuidResponse,
  PodcastBatchByFeedGuidResponse,
  RemoteItemsResponse,
} from '@podverse/helpers';
import { QueryParamsChannelMusicArtist } from '@podverse/helpers-requests';
```

### 4. `apps/web/src/app/artist/[channel_id]/ArtistListHeader.tsx`

**Current**:

```typescript
import {
  QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES,
  QueryParamsChannelMusicArtistType,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  QUERY_PARAMS_CHANNEL_MUSIC_ARTIST_TYPE_VALUES,
  QueryParamsChannelMusicArtistType,
} from '@podverse/helpers-requests';
```

## Verification

After changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
npm run lint -- apps/web/src/app/album apps/web/src/app/artist
```

## Status

✅ Completed (2026-01-29) - All 4 files already had split imports (CRITICAL fix applied)
