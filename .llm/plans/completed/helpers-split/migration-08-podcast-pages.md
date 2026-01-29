# Migration Part 8: Podcast Pages

## Scope

Update QueryParams imports in podcast-related page components.

## Files to Update (5)

### 1. `apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts`

**Current**:

```typescript
import {
  QueryParamsChannelType,
  QueryParamsChannelSort,
  QueryParamsStatsRange,
  QueryParamsGlobalSort,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  QueryParamsChannelType,
  QueryParamsChannelSort,
  QueryParamsStatsRange,
  QueryParamsGlobalSort,
} from '@podverse/helpers-requests';
```

### 2. `apps/web/src/app/podcast/[channel_id]/PodcastClient.tsx`

**Current**:

```typescript
import {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  QueryParamsChannel,
  RemoteItemsResponse,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  DTOChannel,
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  RemoteItemsResponse,
} from '@podverse/helpers';
import { QueryParamsChannel } from '@podverse/helpers-requests';
```

### 3. `apps/web/src/app/podcast/[channel_id]/PodcastContext.tsx`

**Current**:

```typescript
import {
  DTOClip,
  DTOItem,
  DTOItemSoundbite,
  getTotalPages,
  QueryParamsChannel,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOClip, DTOItem, DTOItemSoundbite, getTotalPages } from '@podverse/helpers';
import { QueryParamsChannel } from '@podverse/helpers-requests';
```

### 4. `apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx`

**Current**:

```typescript
import {
  DTOChannel,
  DTOItem,
  QueryParamsLiveItem,
  QueryParamsQueueMedium,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
import { QueryParamsLiveItem } from '@podverse/helpers-requests';
```

### 5. `apps/web/src/app/podcasts/PodcastsContext.tsx`

**Current**:

```typescript
import {
  DTOChannel,
  getTotalPages,
  QueryParamsGetMany,
  removeQueryParamByPattern,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOChannel, getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import { QueryParamsGetMany } from '@podverse/helpers-requests';
```

## Verification

After changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
npm run lint -- apps/web/src/app/podcast
```

## Status

✅ Complete (2026-01-29)
