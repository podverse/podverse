# Migration 03A: Web Verification (Podcasts + Tracks)

## Overview

Verify the web app continues to validate query params after Migration 01. No code changes expected.

## Scope

**Files to verify (no changes expected):**

- `apps/web/src/app/podcasts/page.tsx`
- `apps/web/src/app/tracks/page.tsx`

## Verification Steps

1. Confirm Zod enums still use the same exported constants:
   - `QUERY_PARAMS_SUBSCRIBED_TYPE`
   - `QUERY_PARAMS_SUBSCRIBED_FULL_SORT`
   - `QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT`
   - `QUERY_PARAMS_STATS_RANGE_VALUES`
2. Run:
   - `npm run build:packages`
   - `cd apps/web && npx tsc --noEmit`
   - `cd apps/web && npm run build`
3. Manual test URLs:
   - `http://localhost:3000/podcasts?type=global&sort=recent`
   - `http://localhost:3000/podcasts?type=subscribed&category=Technology`
   - `http://localhost:3000/podcasts?type=invalid`
   - `http://localhost:3000/tracks?type=global&sort=recent`
   - `http://localhost:3000/tracks?type=subscribed&sort=top&range=week`
   - `http://localhost:3000/tracks?sort=invalid`

## Expected Outcome

- No TypeScript errors.
- Zod validation falls back gracefully on invalid query params.
