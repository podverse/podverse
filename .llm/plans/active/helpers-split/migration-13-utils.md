# Migration Part 13: Utility Files

## Scope

Update QueryParams imports in utility files.

## Files to Update (2)

### 1. `apps/web/src/utils/categories.ts`

**Current**:

```typescript
import {
  DTOCategory,
  QUERY_PARAMS_GLOBAL_SORT_VALUES,
  QueryParamsGlobalSort,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOCategory } from '@podverse/helpers';
import { QUERY_PARAMS_GLOBAL_SORT_VALUES, QueryParamsGlobalSort } from '@podverse/helpers-requests';
```

### 2. `apps/web/src/utils/localSettings/localSettings.ts` ⭐

**Current** (imports 9 QueryParams types!):

```typescript
import {
  CategoryMappingKeys,
  LiveItemStatus,
  QueryParamsHomeSort,
  QueryParamsMedium,
  QueryParamsPlaylistsType,
  QueryParamsQueueMedium,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
  QueryParamsSubscribedPartialSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers';
```

**Fixed** (split into two imports):

```typescript
import {
  CategoryMappingKeys,
  LiveItemStatus,
  QueryParamsMedium,
  QueryParamsQueueMedium,
} from '@podverse/helpers';
import {
  QueryParamsHomeSort,
  QueryParamsPlaylistsType,
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedMusicType,
  QueryParamsSubscribedPartialSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';
```

**Note**: This file imports the most QueryParams types (7 moving to helpers-requests, 2 staying in helpers).

## Verification

After changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
npm run lint -- apps/web/src/utils
```

## Status

⏳ Ready to execute
