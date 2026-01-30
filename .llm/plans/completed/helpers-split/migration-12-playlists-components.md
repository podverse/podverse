# Migration Part 12: Playlists & List Components

## Scope

Update QueryParams imports in playlist contexts and list components.

## Files to Update (5)

### 1. `apps/web/src/app/playlist/[playlist_id]/PlaylistContext.tsx`

**Current**:

```typescript
import {
  DTOPlaylist,
  DTOPlaylistResource,
  getTotalPages,
  QueryParamsPlaylistResources,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOPlaylist, DTOPlaylistResource, getTotalPages } from '@podverse/helpers';
import { QueryParamsPlaylistResources } from '@podverse/helpers-requests';
```

### 2. `apps/web/src/components/Modal/ModalPlaylistAddTo.tsx`

**Current**:

```typescript
import {
  getQueryParamFromQueueMediumId,
  getQueueMediumIdForChannelMediumId,
  MediumEnum,
  QueryParamsQueueMedium,
} from '@podverse/helpers';
```

**Fixed**: No change needed - `QueryParamsQueueMedium` stays in helpers ✅

### 3. `apps/web/src/components/List/Queues/ListQueueResources.tsx`

**Current**:

```typescript
import {
  DTOQueueResource,
  getQueueMediumIdFromType,
  MediumEnum,
  QueryParamsQueueMedium,
} from '@podverse/helpers';
```

**Fixed**: No change needed - `QueryParamsQueueMedium` stays in helpers ✅

### 4. `apps/web/src/components/List/ItemSoundbites/ListItemSoundbites.tsx`

**Current**:

```typescript
import {
  CategoryMappingKeys,
  DTOChannel,
  DTOItem,
  DTOItemSoundbite,
  QueryParamsItemsType,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { CategoryMappingKeys, DTOChannel, DTOItem, DTOItemSoundbite } from '@podverse/helpers';
import { QueryParamsItemsType } from '@podverse/helpers-requests';
```

### 5. `apps/web/src/components/List/Clips/ListClips.tsx`

**Current**:

```typescript
import {
  CategoryMappingKeys,
  DTOChannel,
  DTOClip,
  DTOItem,
  QueryParamsItemsType,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { CategoryMappingKeys, DTOChannel, DTOClip, DTOItem } from '@podverse/helpers';
import { QueryParamsItemsType } from '@podverse/helpers-requests';
```

## Actual Files Needing Updates

Only 3 files need changes:

1. PlaylistContext.tsx
2. ListItemSoundbites.tsx
3. ListClips.tsx

## Verification

After changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
npm run lint -- apps/web/src/app/playlist apps/web/src/components/List
```

## Status

✅ Completed
