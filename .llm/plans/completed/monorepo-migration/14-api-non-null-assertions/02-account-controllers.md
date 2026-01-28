# Phase 2: Fix req.user! in Account Controllers

**Status:** Pending

## Overview

Replace `req.user!` non-null assertions with `getAuthenticatedUser(req)` helper in all account-related controller files.

## Prerequisites

- Phase 1 (Auth Helper Function) must be completed first

## Files to Modify (13 files, ~45 warnings)

| File                                                                                  | Warnings |
| ------------------------------------------------------------------------------------- | -------- |
| `apps/api/src/controllers/account/account.ts`                                         | 8        |
| `apps/api/src/controllers/account/accountFCMDevice.ts`                                | 5        |
| `apps/api/src/controllers/account/accountFollowingAccount.ts`                         | 3        |
| `apps/api/src/controllers/account/accountFollowingAddByRSSChannel.ts`                 | 2        |
| `apps/api/src/controllers/account/accountFollowingChannel.ts`                         | 3        |
| `apps/api/src/controllers/account/accountFollowingPlaylist.ts`                        | 3        |
| `apps/api/src/controllers/account/accountNotificationChannel.ts`                      | 4        |
| `apps/api/src/controllers/account/accountNotificationChannelType.ts`                  | 2        |
| `apps/api/src/controllers/account/accountPayPalOrder.ts`                              | 2        |
| `apps/api/src/controllers/account/accountSettings/accountSettingsLocale.ts`           | 1        |
| `apps/api/src/controllers/account/accountSettings/accountSettingsNotificationType.ts` | 2        |
| `apps/api/src/controllers/account/accountUPDevice.ts`                                 | 6        |
| `apps/api/src/controllers/account/accountWebPushDevice.ts`                            | 5        |

## Pattern to Replace

**Before:**

```typescript
import { ensureAuthenticated } from '@api/lib/auth';

ensureAuthenticated(req, res, async () => {
  const account_id = req.user!.id;
  // or
  const jwtUser = req.user!;
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
   - If `req.user!.id` is used directly, extract to a variable first

2. Run linter to verify no new errors introduced
