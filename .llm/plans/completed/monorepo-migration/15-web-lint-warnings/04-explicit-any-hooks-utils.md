# Phase 4: Fix Explicit Any in Hooks/Utils/Other

**Status:** Pending

## Overview

Fix 30 `@typescript-eslint/no-explicit-any` warnings in hooks/, utils/, constants/, and providers/.

## Files to Modify

### Constants (4 warnings)

1. `src/constants/medium.ts`
   - Line 4:23
   - Line 8:42
   - Line 27:52

2. `src/constants/sharableStatus.ts`
   - Line 4:22

### Hooks (7 warnings)

3. `src/hooks/useAutoQueueLoadResources.tsx`
   - Line 56:37

4. `src/hooks/useFilterDefaults.ts`
   - Line 8:75
   - Line 9:42
   - Line 30:29

5. `src/hooks/useMediaPlayerResourceUpdate.tsx`
   - Line 129:42
   - Line 129:75

6. `src/hooks/useSkipInitialEffect.tsx`
   - Line 3:79

### Providers (1 warning)

7. `src/providers/Providers.tsx`
   - Line 34:28

### Utils (18 warnings)

8. `src/utils/categories.ts`
   - Line 5:29
   - Line 6:17
   - Line 9:11

9. `src/utils/downloadModal/downloadEpisodeWithModal.ts`
   - Line 7:50

10. `src/utils/downloadModal/downloadTrackWithModal.ts`
    - Line 7:50

11. `src/utils/localSettings/localSettings.ts`
    - Line 160:41
    - Line 175:54

12. `src/utils/mediaPlayer/mediaPlayerLayout.ts`
    - Line 1:60

13. `src/utils/rateLimit/rateLimitAlert.ts`
    - Line 4:49
    - Line 7:15
    - Line 8:15
    - Line 9:15
    - Line 12:15
    - Line 13:15
    - Line 14:15
    - Line 22:21
    - Line 23:19
    - Line 24:28
    - Line 25:19

## Approach

- Replace `any` with specific types
- Use `unknown` for truly dynamic types
- Import types from `@podverse/helpers` where available
