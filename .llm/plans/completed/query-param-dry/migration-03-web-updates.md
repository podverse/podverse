# Migration 03: Web App Query Param Updates

> **Status**: This plan has been split into smaller verification subplans.
> Use the files below for execution.

## Subplans

- `migration-03a-web-podcasts-tracks.md`
- `migration-03b-web-profiles-queues.md`

## Overview

Update web app pages to use the consolidated query parameter constants from Migration 01. Since
the web app already imports from helpers packages, these changes ensure the app benefits from the
new shared base constants and maintains consistency with API validation.

## Scope

**Total files to update:** 4 Next.js page components
**Total Zod schemas to review:** 4
**Breaking changes:** None - exported constant names unchanged

## Files to Modify

1. `apps/web/src/app/podcasts/page.tsx`
2. `apps/web/src/app/tracks/page.tsx`
3. `apps/web/src/app/profiles/page.tsx`
4. `apps/web/src/app/queues/page.tsx`

## Current State Analysis

All four files use the **same pattern:**

1. Import constants from helpers packages
2. Define Zod schema using `z.enum(CONSTANT)`
3. Parse searchParams with `.safeParse()`
4. Handle validation failures with fallback logic

### Shared Constants Used Across Multiple Files

| Constant                              | Used In                       | After Migration 01        |
| ------------------------------------- | ----------------------------- | ------------------------- |
| `QUERY_PARAMS_STATS_RANGE_VALUES`     | podcasts, tracks, profiles    | ✅ No change (unique)     |
| `QUERY_PARAMS_SUBSCRIBED_TYPE`        | podcasts, profiles            | ✅ Now uses base constant |
| `QUERY_PARAMS_SUBSCRIBED_FULL_SORT`   | podcasts, profiles            | ✅ No change (unique)     |
| `QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE`  | tracks                        | ✅ No change (unique)     |
| `QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT | tracks                        | ✅ No change (alias)      |
| `QUERY_PARAMS_QUEUE_MEDIUMS`          | queues                        | ✅ No change (unique)     |
| `CATEGORY_MAPPING_KEYS`               | podcasts                      | ✅ No change (unique)     |
| `QueryParamsMedium` (type)            | podcasts, tracks (hardcoded)  | ✅ Type, not value        |
| `QueryParamsQueueMedium` (type)       | queues                        | ✅ Type, not value        |
| `QueryParamsSubscribedFullSort` (type | profiles (for custom sorting) | ✅ Type, not value        |

## Impact Assessment

### ✅ No Breaking Changes

After Migration 01, all exported constant **names** remain unchanged:

- `QUERY_PARAMS_SUBSCRIBED_TYPE` still exists (now references `TYPE_GLOBAL_SUBSCRIBED_CATEGORY`)
- `QUERY_PARAMS_ITEMS_TYPE_VALUES` still exists (now references `TYPE_GLOBAL_SUBSCRIBED_CATEGORY`)
- All other constants unchanged

### ✅ Type Safety Maintained

TypeScript types are derived from constants using `(typeof CONSTANT)[number]`, so they
automatically work with the consolidated base constants.

### ✅ Runtime Behavior Identical

The web app imports the same constant names, so it automatically gets the consolidated values
without any code changes.

## Verification-Only Updates

Since exported constant names are unchanged, these files **require no code modifications**. However,
we should verify they work correctly after Migration 01.

---

### 1. `apps/web/src/app/podcasts/page.tsx`

**Current imports (lines 1-12):**

```typescript
import { CATEGORY_MAPPING_KEYS, QueryParamsMedium } from '@podverse/helpers';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_TYPE, // Now references TYPE_GLOBAL_SUBSCRIBED_CATEGORY
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
  ApiListResponse,
} from '@podverse/helpers-requests';
```

**Verification checklist:**

- [ ] `QUERY_PARAMS_SUBSCRIBED_TYPE` resolves to correct values after Migration 01
- [ ] Zod schema `z.enum(QUERY_PARAMS_SUBSCRIBED_TYPE)` accepts `['global', 'subscribed',
    'category']`
- [ ] Type inference for `type` query param works correctly
- [ ] Page renders without TypeScript errors

**Manual test:**

```bash
# Visit these URLs and verify validation works:
http://localhost:3000/podcasts?type=global&sort=recent
http://localhost:3000/podcasts?type=subscribed&category=Technology
http://localhost:3000/podcasts?type=invalid  # Should fallback gracefully
```

---

### 2. `apps/web/src/app/tracks/page.tsx`

**Current imports (lines 1-8):**

```typescript
import { DTOItem, getTotalPages, QueryParamsMedium } from '@podverse/helpers';
import {
  ApiListResponse,
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_MUSIC_TYPE,
  QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT, // Alias to QUERY_PARAMS_GLOBAL_SORT_VALUES
} from '@podverse/helpers-requests';
```

**Note:** `QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT` is an alias set to
`QUERY_PARAMS_GLOBAL_SORT_VALUES` (line 153 in queryParams.ts). After Migration 01,
`QUERY_PARAMS_GLOBAL_SORT_VALUES` references `SORT_RECENT_OLDEST_TOP`, so the alias automatically
gets the consolidated values.

**Verification checklist:**

- [ ] `QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT` resolves to `['recent', 'oldest', 'top']`
- [ ] Zod schema `z.enum(QUERY_PARAMS_SUBSCRIBED_PARTIAL_SORT)` works correctly
- [ ] Type inference for `sort` query param works correctly
- [ ] Page renders without TypeScript errors

**Manual test:**

```bash
# Visit these URLs and verify validation works:
http://localhost:3000/tracks?type=global&sort=recent
http://localhost:3000/tracks?type=subscribed&sort=top&range=week
http://localhost:3000/tracks?sort=invalid  # Should fallback gracefully
```

---

### 3. `apps/web/src/app/profiles/page.tsx`

**Current imports (lines 1-7):**

```typescript
import { getTotalPages, DTOAccount } from '@podverse/helpers';
import {
  QUERY_PARAMS_STATS_RANGE_VALUES,
  QUERY_PARAMS_SUBSCRIBED_TYPE, // Now references TYPE_GLOBAL_SUBSCRIBED_CATEGORY
  QUERY_PARAMS_SUBSCRIBED_FULL_SORT,
  QueryParamsSubscribedFullSort, // Type import (for custom sort logic line 124)
} from '@podverse/helpers-requests';
```

**Special note:** This page imports both the constant (`QUERY_PARAMS_SUBSCRIBED_FULL_SORT`) and the
type (`QueryParamsSubscribedFullSort`). The type is used in custom sort resolution logic at line 124. Both continue to work after Migration 01.

**Verification checklist:**

- [ ] `QUERY_PARAMS_SUBSCRIBED_TYPE` resolves to correct values
- [ ] `QueryParamsSubscribedFullSort` type works in custom sort logic
- [ ] Zod schema validation works correctly
- [ ] Custom sort resolution logic (line 124) works correctly
- [ ] Page renders without TypeScript errors

**Manual test:**

```bash
# Visit these URLs and verify validation works:
http://localhost:3000/profiles?type=global&sort=recent
http://localhost:3000/profiles?type=subscribed&sort=a_z
http://localhost:3000/profiles?type=invalid  # Should fallback gracefully
```

---

### 4. `apps/web/src/app/queues/page.tsx`

**Current imports (line 1):**

```typescript
import { DTOQueue, QUERY_PARAMS_QUEUE_MEDIUMS, QueryParamsQueueMedium } from '@podverse/helpers';
```

**Note:** This page imports from `@podverse/helpers` not `@podverse/helpers-requests`.
`QUERY_PARAMS_QUEUE_MEDIUMS` is defined in `packages/helpers/src/lib/medium.ts` and is **not**
affected by Migration 01.

**Verification checklist:**

- [ ] `QUERY_PARAMS_QUEUE_MEDIUMS` still resolves to `['all', 'av', 'music']`
- [ ] Zod schema `z.enum(QUERY_PARAMS_QUEUE_MEDIUMS)` works correctly
- [ ] Default value 'av' works correctly
- [ ] Page renders without TypeScript errors

**Manual test:**

```bash
# Visit these URLs and verify validation works:
http://localhost:3000/queues?medium=av
http://localhost:3000/queues?medium=music
http://localhost:3000/queues  # Should default to 'av'
http://localhost:3000/queues?medium=invalid  # Should fallback to 'av'
```

---

## Summary

| File              | Code Changes | Reason                                      |
| ----------------- | ------------ | ------------------------------------------- |
| podcasts/page.tsx | ✅ None      | Constant names unchanged in helpers         |
| tracks/page.tsx   | ✅ None      | Alias automatically gets consolidated value |
| profiles/page.tsx | ✅ None      | Constant names unchanged in helpers         |
| queues/page.tsx   | ✅ None      | Imports from helpers/medium.ts (unaffected) |
| **Total changes** | **0 files**  | **Verification only**                       |

## Benefits

1. **Zero Breaking Changes**: Exported names unchanged means zero updates needed
2. **Automatic Improvement**: Web app automatically benefits from consolidated constants
3. **Type Safety Maintained**: All type inference continues to work correctly
4. **Consistent Validation**: Web, API, and helpers all validate against same base constants

## Verification Checklist

After Migration 01 completes:

- [ ] `npm run build:packages` succeeds
- [ ] `cd apps/web && npm run build` succeeds (Next.js build)
- [ ] TypeScript compiles without errors in apps/web
- [ ] All 4 pages render correctly in dev mode
- [ ] Query param validation works on all 4 pages (manual test URLs above)
- [ ] Invalid query params handled gracefully (fallback logic works)
- [ ] Browser console shows no errors
- [ ] Zod validation errors formatted correctly

## Testing Strategy

### Automated Testing

```bash
# 1. Build packages (includes helpers-requests with consolidated constants)
npm run build:packages

# 2. Type check web app
cd apps/web
npx tsc --noEmit

# 3. Build web app
npm run build

# 4. Start web app in dev mode
npm run dev
```

### Manual Testing

For each of the 4 pages:

1. Visit page with valid query params
2. Verify page loads correctly
3. Visit page with invalid query params
4. Verify fallback logic works (no crashes)
5. Check browser console for errors
6. Check Network tab for API calls (verify query params sent correctly)

### Regression Testing

- [ ] Existing functionality unchanged (no behavior changes)
- [ ] All dropdown filters work correctly
- [ ] Pagination works correctly
- [ ] Sort/filter combinations work correctly
- [ ] URL state persists correctly on navigation

## Dependencies

**Must complete first:**

- Migration 01 (Helpers Dedupe) - Creates consolidated base constants

**Blocks:**

- None - This is the final migration

## Notes

- This migration is essentially a **verification pass** since exported names are unchanged
- The web app automatically benefits from the consolidation done in Migration 01
- No code changes needed unless Migration 01 introduced breaking changes (it doesn't)
- Focus testing on ensuring Zod schemas still work with consolidated constants
- The true benefit is **maintainability** - future changes only need to update base constants
