# Migration Part 2: Playlists QueryParams

## Scope

Update QueryParams imports in playlist-related files.

## Files to Update (1)

### 1. `apps/web/src/app/playlists/PlaylistsDropdownConfig.ts`

**Current import** (line 1):

```typescript
import { QueryParamsQueueMedium } from '@podverse/helpers';
```

**Action**: No change needed
**Reason**: `QueryParamsQueueMedium` correctly stays in `@podverse/helpers`

## Result

✅ No changes needed - file is already correct

## Status

✅ Complete
