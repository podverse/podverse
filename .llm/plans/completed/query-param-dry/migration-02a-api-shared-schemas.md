# Migration 02A: API Shared Joi Schemas

## Overview

Create shared Joi schemas in `apps/api/src/lib/validation/querySchemas.ts` and re-export them from
`apps/api/src/lib/validation/index.ts`. This is the required foundation for all controller updates.

## Scope

**Files to modify:**

- `apps/api/src/lib/validation/querySchemas.ts` (new)
- `apps/api/src/lib/validation/index.ts`

## Shared Schema Catalog

Create and export these schemas in `querySchemas.ts`:

### ID Param Schemas

- `idOrIdTextParamSchema`
- `playlistIdTextParamSchema`
- `queueIdTextParamSchema`
- `channelIdTextParamSchema`
- `itemIdTextParamSchema`
- `clipIdTextParamSchema`
- `itemSoundbiteIdTextParamSchema`
- `accountIdTextParamSchema`

### Query Pagination Schemas

- `pageQuerySchema`
- `pageDefaultQuerySchema`
- `pageRangeQuerySchema` (use `QUERY_PARAMS_STATS_RANGE_VALUES`)

### Medium + Page Schemas

- `mediumPageQuerySchema` (use `QUERY_PARAMS_MEDIUMS`)
- `mediumPageRangeQuerySchema` (use `QUERY_PARAMS_MEDIUMS`,
  `QUERY_PARAMS_STATS_RANGE_VALUES`)
- `mediumCategoryPageQuerySchema` (use `QUERY_PARAMS_MEDIUMS`, `CATEGORY_MAPPING_KEYS`)
- `mediumCategoryPageRangeQuerySchema` (use `QUERY_PARAMS_MEDIUMS`,
  `CATEGORY_MAPPING_KEYS`, `QUERY_PARAMS_STATS_RANGE_VALUES`)

### Queue / Playlist Position Schemas

- `positionBetweenBodySchema`

### Locale / Token / Email Schemas

- `localeBodySchema`
- `tokenBodySchema`
- `emailBodySchema`

## Implementation Steps

1. Create `apps/api/src/lib/validation/querySchemas.ts`.
2. Import `Joi` and the shared constants:
   - `QUERY_PARAMS_MEDIUMS`, `QUERY_PARAMS_STATS_RANGE_VALUES` from
     `@podverse/helpers-requests`
   - `CATEGORY_MAPPING_KEYS` from `@podverse/helpers`
3. Define the schema objects exactly as specified in the main migration plan.
4. Export all schemas listed above.
5. Update `apps/api/src/lib/validation/index.ts` to include:
   - `export * from './querySchemas'`

## Verification

- [ ] File compiles without TypeScript errors.
- [ ] All schemas are exported from `@api/lib/validation`.

## Notes

- Do not modify any controllers in this step.
- Use shared query param constants for any `Joi.valid(...)` arrays.
