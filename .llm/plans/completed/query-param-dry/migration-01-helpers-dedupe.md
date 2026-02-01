# Migration 01: Helpers Query Param Deduplication

## Overview

Consolidate duplicate query parameter arrays in `helpers-requests/queryParams.ts` into shared
base constants. This eliminates redundancy, fixes a missing `as const` declaration, and
establishes a single source of truth for common query parameter value sets.

## Scope

**Files to modify:**

- `packages/helpers-requests/src/api/queryParams.ts`

**Files analyzed but no changes needed:**

- `packages/helpers/src/lib/medium.ts` - Already defines unique constants (no duplication)
- `packages/helpers/src/lib/category.ts` - Uses `Object.keys()` pattern (no duplication)
- `packages/helpers/src/lib/accountNotificationType.ts` - Uses enum values (no duplication)
- `packages/helpers/src/dtos/account/accountFCMDevice.ts` - Uses enum values (no duplication)
- `packages/helpers/src/dtos/liveItem/liveItemStatus.ts` - Single constant (no duplication)

## Identified Duplications

### Group A: `['recent', 'oldest', 'top']` (5 instances)

**Current state:**

```typescript
// Line 147
export const QUERY_PARAMS_GLOBAL_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// Line 183
export const QUERY_PARAMS_CHANNEL_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// Line 243 - ⚠️ MISSING `as const`
export const QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES = ['recent', 'oldest', 'top'];

// Line 275
export const QUERY_PARAMS_ITEM_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// Line 298
export const QUERY_PARAMS_ITEMS_SORT_VALUES = ['recent', 'oldest', 'top'] as const;
```

**Consolidation target:** Create a single base constant `SORT_RECENT_OLDEST_TOP`

### Group B: `['global', 'subscribed', 'category']` (2 instances)

**Current state:**

```typescript
// Line 144
export const QUERY_PARAMS_SUBSCRIBED_TYPE = ['global', 'subscribed', 'category'] as const;

// Line 297
export const QUERY_PARAMS_ITEMS_TYPE_VALUES = ['global', 'subscribed', 'category'] as const;
```

**Consolidation target:** Create a single base constant `TYPE_GLOBAL_SUBSCRIBED_CATEGORY`

### Group C: `['recent', 'oldest']` (2 instances)

**Current state:**

```typescript
// Line 313
export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES = ['recent', 'oldest'] as const;

// Line 323
export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES = ['recent', 'oldest'] as const;
```

**Consolidation target:** Create a single base constant `SORT_RECENT_OLDEST`

## Implementation Steps

### Step 1: Add Base Constants Section

**Location:** After imports (line ~4), before the first interface definition

**Add:**

```typescript
// ===== BASE CONSTANTS =====
// Shared query parameter value sets used across multiple contexts.
// These base constants eliminate duplication and serve as the single source of truth.

/** Base sort values: chronological order plus top-ranked */
export const SORT_RECENT_OLDEST_TOP = ['recent', 'oldest', 'top'] as const;

/** Base sort values: chronological order only */
export const SORT_RECENT_OLDEST = ['recent', 'oldest'] as const;

/** Base type values: global, subscribed, or category-filtered feeds */
export const TYPE_GLOBAL_SUBSCRIBED_CATEGORY = ['global', 'subscribed', 'category'] as const;
```

### Step 2: Replace Group A (5 instances)

**Line 147 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_GLOBAL_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// AFTER
export const QUERY_PARAMS_GLOBAL_SORT_VALUES = SORT_RECENT_OLDEST_TOP;
```

**Line 183 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_CHANNEL_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// AFTER
export const QUERY_PARAMS_CHANNEL_SORT_VALUES = SORT_RECENT_OLDEST_TOP;
```

**Line 243 - Replace (fixes missing `as const`):**

```typescript
// BEFORE (missing as const)
export const QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES = ['recent', 'oldest', 'top'];

// AFTER (properly typed)
export const QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES = SORT_RECENT_OLDEST_TOP;
```

**Line 275 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_ITEM_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// AFTER
export const QUERY_PARAMS_ITEM_SORT_VALUES = SORT_RECENT_OLDEST_TOP;
```

**Line 298 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_ITEMS_SORT_VALUES = ['recent', 'oldest', 'top'] as const;

// AFTER
export const QUERY_PARAMS_ITEMS_SORT_VALUES = SORT_RECENT_OLDEST_TOP;
```

### Step 3: Replace Group B (2 instances)

**Line 144 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_SUBSCRIBED_TYPE = ['global', 'subscribed', 'category'] as const;

// AFTER
export const QUERY_PARAMS_SUBSCRIBED_TYPE = TYPE_GLOBAL_SUBSCRIBED_CATEGORY;
```

**Line 297 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_ITEMS_TYPE_VALUES = ['global', 'subscribed', 'category'] as const;

// AFTER
export const QUERY_PARAMS_ITEMS_TYPE_VALUES = TYPE_GLOBAL_SUBSCRIBED_CATEGORY;
```

### Step 4: Replace Group C (2 instances)

**Line 313 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES = ['recent', 'oldest'] as const;

// AFTER
export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES = SORT_RECENT_OLDEST;
```

**Line 323 - Replace:**

```typescript
// BEFORE
export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES = ['recent', 'oldest'] as const;

// AFTER
export const QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES = SORT_RECENT_OLDEST;
```

## Type Safety

All existing type definitions will continue to work correctly:

```typescript
// These type definitions remain unchanged and will correctly infer from base constants
export type QueryParamsGlobalSort = (typeof QUERY_PARAMS_GLOBAL_SORT_VALUES)[number];
export type QueryParamsChannelSort = (typeof QUERY_PARAMS_CHANNEL_SORT_VALUES)[number];
export type QueryParamsClipsByChannelSort =
  (typeof QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES)[number]; // Now properly typed!
export type QueryParamsItemSort = (typeof QUERY_PARAMS_ITEM_SORT_VALUES)[number];
export type QueryParamsItemsSort = (typeof QUERY_PARAMS_ITEMS_SORT_VALUES)[number];
export type QueryParamsSubscribedType = (typeof QUERY_PARAMS_SUBSCRIBED_TYPE)[number];
export type QueryParamsItemsType = (typeof QUERY_PARAMS_ITEMS_TYPE_VALUES)[number];
export type QueryParamsItemSoundbitesByChannelSort =
  (typeof QUERY_PARAMS_ITEM_SOUNDBITES_BY_CHANNEL_SORT_VALUES)[number];
export type QueryParamsItemSoundbitesByItemSort =
  (typeof QUERY_PARAMS_ITEM_SOUNDBITES_BY_ITEM_SORT_VALUES)[number];
```

## Benefits

1. **Single Source of Truth**: Each unique value set exists exactly once
2. **Bug Fix**: Fixes missing `as const` on `QUERY_PARAMS_CLIPS_BY_CHANNEL_SORT_VALUES` (line 243)
3. **No Breaking Changes**: All exported names remain identical
4. **Reduced Duplication**: Eliminates 6 redundant array declarations
5. **Better Maintainability**: Changes to base values propagate automatically to all consumers
6. **Type Safety Maintained**: All TypeScript types continue to work correctly

## Verification Checklist

- [ ] All 3 base constants added with proper `as const` declarations
- [ ] All 9 duplicate constants replaced with references to base constants
- [ ] File compiles without TypeScript errors
- [ ] `npm run build:packages` succeeds
- [ ] No imports need updating (all changes internal to queryParams.ts)
- [ ] Type inference works correctly for all derived types
- [ ] Exported constant names unchanged (maintains backward compatibility)

## Dependencies

**None** - This is a purely internal refactoring within a single file. No other files import the
base constants we're creating; they only import the existing exported constants which remain
unchanged.

## Next Steps

After this migration completes, proceed to **Migration 02: API Joi Refactor** which will use
these consolidated constants in API validation schemas.
