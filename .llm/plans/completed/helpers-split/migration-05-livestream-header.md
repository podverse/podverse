# Migration Part 5: Livestream Header QueryParams

## Scope

Update QueryParams imports in livestream header component.

## Files to Update (1)

### 1. `apps/web/src/components/Media/Livestream/LivestreamHeader.tsx`

**Current import** (line 1):

```typescript
import { DTOChannel, DTOItem, QueryParamsQueueMedium } from '@podverse/helpers';
```

**Action**: No change needed
**Reason**: `QueryParamsQueueMedium` correctly stays in `@podverse/helpers`

## Result

✅ No changes needed - file is already correct

## Status

✅ Complete
