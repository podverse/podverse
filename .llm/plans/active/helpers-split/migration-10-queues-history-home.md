# Migration Part 10: Queues, History & Home

## Scope

Update QueryParams imports in queues, history, and home page components.

## Files to Update (4)

### 1. `apps/web/src/app/queues/QueuesPageContext.tsx`

**Current**:

```typescript
import {
  DTOQueue,
  DTOQueueResource,
  getQueueMediumIdFromType,
  MediumEnum,
  QueryParamsQueues,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  DTOQueue,
  DTOQueueResource,
  getQueueMediumIdFromType,
  MediumEnum,
} from '@podverse/helpers';
import { QueryParamsQueues } from '@podverse/helpers-requests';
```

### 2. `apps/web/src/app/history/HistoryPageContext.tsx`

**Current**:

```typescript
import {
  DTOQueue,
  DTOQueueResource,
  getQueueMediumIdFromType,
  getTotalPages,
  QueryParamsHistory,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import {
  DTOQueue,
  DTOQueueResource,
  getQueueMediumIdFromType,
  getTotalPages,
} from '@podverse/helpers';
import { QueryParamsHistory } from '@podverse/helpers-requests';
```

### 3. `apps/web/src/app/HomeHeader.tsx`

**Current**:

```typescript
import {
  QUERY_PARAMS_HOME_SORT_VALUES,
  QueryParamsHomeSort,
  QueryParamsMedium,
  QUERY_PARAMS_MEDIUMS,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { QueryParamsMedium, QUERY_PARAMS_MEDIUMS } from '@podverse/helpers';
import { QUERY_PARAMS_HOME_SORT_VALUES, QueryParamsHomeSort } from '@podverse/helpers-requests';
```

### 4. `apps/web/src/app/profiles/ProfilesContext.tsx`

**Current**:

```typescript
import {
  DTOAccount,
  getTotalPages,
  QueryParamsSubscribedType,
  QueryParamsSubscribedFullSort,
  QueryParamsStatsRange,
} from '@podverse/helpers';
```

**Fixed**:

```typescript
import { DTOAccount, getTotalPages } from '@podverse/helpers';
import {
  QueryParamsSubscribedType,
  QueryParamsSubscribedFullSort,
  QueryParamsStatsRange,
} from '@podverse/helpers-requests';
```

## Verification

After changes:

```bash
cd /Users/mitcheldowney/repos/pv/podverse
npm run lint -- apps/web/src/app/queues apps/web/src/app/history apps/web/src/app/HomeHeader.tsx apps/web/src/app/profiles
```

## Status

⏳ Ready to execute
