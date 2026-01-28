# Phase 5: Fix Remaining Non-Null Assertions

**Status:** Pending

## Overview

Fix the remaining non-null assertion warnings that don't fit the `req.user!` or `process.env!` patterns.

## Files to Modify

### liveItem.ts (6 warnings)

Location: `apps/api/src/controllers/liveItem.ts`
Lines: 83, 86, 89 (2 assertions per line)

These appear to be accessing properties on objects that may be null. Need to review each case and add proper null checks or optional chaining.

**Approach:**

1. Read the file to understand the context
2. Add null checks or use optional chaining where appropriate
3. If the values are guaranteed by prior logic, add a comment explaining why

## Implementation Steps

1. Review each warning location to understand the context
2. Determine if:
   - The value is guaranteed by prior logic (add explanatory comment + targeted disable)
   - The value needs a null check (add proper guard)
   - The value can use optional chaining (refactor)

3. Run linter to verify all warnings are resolved

## Expected Outcome

After completing all 5 phases:

- 0 `@typescript-eslint/no-non-null-assertion` warnings
- All code uses type-safe patterns
- Runtime safety maintained or improved
