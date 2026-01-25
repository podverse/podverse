# Phase 1: Fix Non-Null Assertion Warnings

**Status:** Pending

## Overview

Fix 12 `@typescript-eslint/no-non-null-assertion` warnings across 4 files.

## Files to Modify

### 1. `src/app/clip/edit/[clip_id]/ClipEditForm.tsx` (1 warning)
- Line 72:16

### 2. `src/components/Content/About/ContentPeopleRow.tsx` (8 warnings)
- Line 23:15
- Line 30:11
- Line 33:20
- Line 34:20
- Line 40:13
- Line 42:18
- Line 47:13
- Line 49:18

### 3. `src/components/List/Music/Albums/Tracks/ListTrackRemoteItemNodes.tsx` (2 warnings)
- Line 27:32
- Line 56:30

### 4. `src/hooks/usePageStateCache.ts` (1 warning)
- Line 64:33

## Approach

For each non-null assertion:
1. Check if optional chaining (`?.`) can replace the assertion
2. Add null checks with early returns where appropriate
3. Use type narrowing/guards if the value is guaranteed by prior logic
