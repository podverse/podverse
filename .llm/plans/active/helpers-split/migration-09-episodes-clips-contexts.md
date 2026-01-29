# Migration Part 9: Episodes, Clips & Episode Contexts

## Scope

Update QueryParams imports in episodes, clips, and episode context files.

## Files to Update (4)

### 1. `apps/web/src/app/podcasts/livestreams/LivestreamsContext.tsx`

**Current**:

```typescript
import {
  DTOItem,
  getTotalPages,
  QueryParamsGetManyLivestreams,
  removeQueryParamByPattern,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOItem, getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import { QueryParamsGetManyLivestreams } from '@podverse/helpers-requests';
```

### 2. `apps/web/src/app/episodes/EpisodesContext.tsx`

**Current**:

```typescript
import {
  DTOItem,
  getTotalPages,
  QueryParamsGetManyPartial,
  removeQueryParamByPattern,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOItem, getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
```

### 3. `apps/web/src/app/episode/[item_id]/EpisodeContext.tsx`

**Current**:

```typescript
import {
  DTOClip,
  DTOItemChapter,
  DTOItemSoundbite,
  getTotalPages,
  QueryParamsItem,
  TranscriptRow,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  DTOClip,
  DTOItemChapter,
  DTOItemSoundbite,
  getTotalPages,
  TranscriptRow,
} from '@podverse/helpers';
import { QueryParamsItem } from '@podverse/helpers-requests';
```

### 4. `apps/web/src/app/clips/ClipsContext.tsx`

**Current**:

```typescript
import {
  DTOClip,
  getTotalPages,
  QueryParamsGetManyPartial,
  removeQueryParamByPattern,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOClip, getTotalPages, removeQueryParamByPattern } from '@podverse/helpers';
import { QueryParamsGetManyPartial } from '@podverse/helpers-requests';
```

## Verification

After changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
npm run lint -- apps/web/src/app/episodes apps/web/src/app/episode apps/web/src/app/clips apps/web/src/app/podcasts/livestreams
```

## Status

⏳ Ready to execute
