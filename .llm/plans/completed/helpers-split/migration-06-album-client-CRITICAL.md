# Migration Part 6: Album Client - CRITICAL FIX

## Scope

Fix the immediate build blocker in Album page client.

## Priority

🚨 **HIGH** - This is blocking the bundle analyzer build

## Files to Update (1)

### 1. `apps/web/src/app/album/[channel_id]/AlbumClient.tsx`

**Current import** (lines 1-6):

```typescript
import {
  DTOChannel,
  DTOItem,
  QueryParamsChannelMusicAlbum,
  RemoteItemsResponse,
} from '@podverse/helpers';
```

**Error**:

```
Type error: Module '"@podverse/helpers"' has no exported member 'QueryParamsChannelMusicAlbum'.
```

**Fix**: Split into two imports

```typescript
import { DTOChannel, DTOItem, RemoteItemsResponse } from '@podverse/helpers';
import { QueryParamsChannelMusicAlbum } from '@podverse/helpers-requests';
```

**Also update type usage** (line 17):

```typescript
interface AlbumClientProps {
  initialQueryParams: QueryParamsChannelMusicAlbum; // Type is now imported from helpers-requests
  ssrChannel: DTOChannel;
  ssrItemsWithLiveItem: DTOItem[];
  ssrItems: DTOItem[];
  ssrTotalPages: number;
  ssrPodroll: RemoteItemsResponse | null;
}
```

## Verification

After fix, run:

```bash
cd /Users/mitcheldowney/repos/pv/podverse/apps/web
npm run build
```

Should complete without the `QueryParamsChannelMusicAlbum` error.

## Status

✅ Superseded by migration-11 (2026-01-29) - AlbumClient.tsx fix already applied via migration-11; no code change needed
