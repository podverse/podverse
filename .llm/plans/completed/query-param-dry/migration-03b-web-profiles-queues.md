# Migration 03B: Web Verification (Profiles + Queues)

## Overview

Verify the web app continues to validate query params after Migration 01. No code changes expected.

## Scope

**Files to verify (no changes expected):**

- `apps/web/src/app/profiles/page.tsx`
- `apps/web/src/app/queues/page.tsx`

## Verification Steps

1. Confirm Zod enums still use the same exported constants:
   - `QUERY_PARAMS_SUBSCRIBED_TYPE`
   - `QUERY_PARAMS_SUBSCRIBED_FULL_SORT`
   - `QUERY_PARAMS_QUEUE_MEDIUMS`
2. Run:
   - `npm run build:packages`
   - `cd apps/web && npx tsc --noEmit`
   - `cd apps/web && npm run build`
3. Manual test URLs:
   - `http://localhost:3000/profiles?type=global&sort=recent`
   - `http://localhost:3000/profiles?type=subscribed&sort=a_z`
   - `http://localhost:3000/profiles?type=invalid`
   - `http://localhost:3000/queues?medium=music`
   - `http://localhost:3000/queues?medium=invalid`

## Expected Outcome

- No TypeScript errors.
- Zod validation falls back gracefully on invalid query params.
