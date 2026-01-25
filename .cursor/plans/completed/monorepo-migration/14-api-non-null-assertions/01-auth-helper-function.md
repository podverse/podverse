# Phase 1: Create Authentication Helper Function

**Status:** ✅ Completed

## Overview

Create a type-safe helper function to extract authenticated users from requests, eliminating the need for non-null assertions after `ensureAuthenticated` middleware.

## Files Modified

- `apps/api/src/lib/auth/index.ts`

## Implementation

Added this helper function:

```typescript
/**
 * Extracts the authenticated user from the request.
 * Call this only inside ensureAuthenticated callbacks where user is guaranteed.
 * @throws Error if user is not present (should never happen in auth context)
 */
export const getAuthenticatedUser = (req: Request): Express.User => {
  if (!req.user) {
    throw new Error('User not authenticated');
  }
  return req.user;
};
```

## Why This Approach

- Provides runtime safety with a clear error message
- Returns properly typed `Express.User` (not `User | undefined`)
- Single point of change if authentication logic evolves
- More readable than repeated null checks

## Dependencies

None - this is the foundation for subsequent phases.
