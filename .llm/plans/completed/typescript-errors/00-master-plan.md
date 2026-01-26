# Fix Remaining TypeScript Errors - Master Plan

This master plan coordinates the fixing of ~63 remaining TypeScript errors in the web app after removing `exactOptionalPropertyTypes`. These errors are from other strict TypeScript flags and need to be addressed.

## Overview

After removing `exactOptionalPropertyTypes`, we went from ~897 errors to ~63 errors. These remaining errors fall into three categories:

1. **Computed Property Names (TS2464)** - 18 errors - ⚠️ Moderately tedious but necessary
2. **Array/Object Access (TS2532, TS18048)** - 26 errors - ✅ **Meaningful bug fixes - prioritize these**
3. **Type Assignments (TS2322, TS2345)** - ~20 errors - ⚠️ Mixed (some legitimate, some questionable)

**See [assessment-and-recommendations.md](assessment-and-recommendations.md) for detailed analysis.**

## Plan Structure

This master plan coordinates three sub-plans that can be executed in parallel or sequentially:

1. **[01-fix-computed-property-names.md](01-fix-computed-property-names.md)** - Fix CSS module class name access
2. **[02-fix-array-object-access.md](02-fix-array-object-access.md)** - Fix array indexing and optional property access (⚠️ **Prevents real bugs**)
3. **[03-fix-type-assignments.md](03-fix-type-assignments.md)** - Fix type mismatches and assignments

## Execution Order (Recommended)

**Priority order based on impact:**

1. **Start with Plan 02** (Array/Object Access) - **Highest priority** - These prevent real runtime bugs
2. **Then Plan 03** (Type Assignments) - Fix legitimate type issues first, consider alternatives for DTO mismatches
3. **Finally Plan 01** (Computed Property Names) - Tedious but necessary, consider utility functions to reduce repetition

## Verification

After completing all plans:

```bash
cd apps/web && npx tsc --noEmit
```

Should show 0 TypeScript errors (or only errors from other sources).

## Progress Tracking

- [ ] Plan 02: Array/Object Access (26 errors) - **Priority: High** - Prevents real bugs
- [ ] Plan 03: Type Assignments (~20 errors) - **Priority: Medium** - Fix legitimate ones first
- [ ] Plan 01: Computed Property Names (18 errors) - **Priority: Medium** - Tedious but necessary

## Key Recommendations

1. **Fix all array/object access errors** - These are real potential bugs that could cause runtime errors
2. **Fix legitimate type assignments** (~12) - Real issues that need defaults or null checks
3. **For DTO mismatches** (~8) - Consider adjusting DTO types or using `Partial<>` instead of fixing object literals
4. **CSS module fixes** - Consider creating utility functions to reduce repetition (see Plan 01)

## Notes

- All plans are independent and can be worked on in parallel
- Each plan includes specific file paths and line numbers
- Common patterns are documented in each plan
- Test after each plan to verify progress
- See assessment document for detailed analysis and alternatives
