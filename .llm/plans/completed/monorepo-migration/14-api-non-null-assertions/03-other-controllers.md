# Phase 3: Fix req.user! in Other Controllers

**Status:** Pending

## Overview

Replace `req.user!` non-null assertions with `getAuthenticatedUser(req)` helper in all non-account controller files.

## Prerequisites

- Phase 1 (Auth Helper Function) must be completed first

## Files to Modify (15 files, ~43 warnings)

| File                                                        | Warnings |
| ----------------------------------------------------------- | -------- |
| `apps/api/src/controllers/channel.ts`                       | 3        |
| `apps/api/src/controllers/clip.ts`                          | 7        |
| `apps/api/src/controllers/item.ts`                          | 2        |
| `apps/api/src/controllers/membershipClaimToken.ts`          | 1        |
| `apps/api/src/controllers/mq/mq.ts`                         | 1        |
| `apps/api/src/controllers/playlist/playlist.ts`             | 14       |
| `apps/api/src/controllers/playlist/playlistResource.ts`     | 1        |
| `apps/api/src/controllers/profileContent.ts`                | 4        |
| `apps/api/src/controllers/queue/queue.ts`                   | 3        |
| `apps/api/src/controllers/queue/queueResource.ts`           | 1        |
| `apps/api/src/controllers/stats/statsTrackEventAccount.ts`  | 1        |
| `apps/api/src/controllers/stats/statsTrackEventChannel.ts`  | 1        |
| `apps/api/src/controllers/stats/statsTrackEventClip.ts`     | 1        |
| `apps/api/src/controllers/stats/statsTrackEventItem.ts`     | 1        |
| `apps/api/src/controllers/stats/statsTrackEventPlaylist.ts` | 1        |

## Pattern to Replace

Same as Phase 2:

**Before:**

```typescript
import { ensureAuthenticated } from '@api/lib/auth';

ensureAuthenticated(req, res, async () => {
  const account_id = req.user!.id;
});
```

**After:**

```typescript
import { ensureAuthenticated, getAuthenticatedUser } from '@api/lib/auth';

ensureAuthenticated(req, res, async () => {
  const jwtUser = getAuthenticatedUser(req);
  const account_id = jwtUser.id;
});
```

## Implementation Steps

1. For each file:
   - Add `getAuthenticatedUser` to the import from `@api/lib/auth`
   - Replace all `req.user!` usages with `getAuthenticatedUser(req)`

2. Run linter to verify no new errors introduced
