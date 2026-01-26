# Fix Array/Object Access (TS2532, TS18048)

**Priority: HIGH** - These fixes prevent real runtime bugs.

This plan fixes 26 TypeScript errors related to array and object access that may return `undefined`. With `noUncheckedIndexedAccess: true`, TypeScript requires explicit null checks for array indexing and optional property access.

**Why this matters**: These are legitimate potential bugs. Accessing array elements or object properties without checking for `undefined` can cause runtime errors. These fixes improve code safety and prevent crashes.

## Strategy

When accessing arrays or optional object properties, we need to:
1. Check if the value exists before using it
2. Provide fallback values or early returns when undefined
3. Use optional chaining and nullish coalescing where appropriate

**Patterns to fix:**
```typescript
// Before (error)
const item = array[index];
item.property

// After (fixed)
const item = array[index];
if (!item) return; // or handle undefined
item.property

// Or with nullish coalescing
const item = array[index] ?? defaultValue;
```

## Files to Fix

### 1. BoostForm Component
- **File**: [`apps/web/src/components/Boost/BoostForm.tsx`](apps/web/src/components/Boost/BoostForm.tsx)
- **Line**: 167
- **Issue**: Object properties possibly undefined (2 errors)
- **Fix**: Add null checks before accessing properties

### 2. ListPlaylistResources Component
- **File**: [`apps/web/src/components/List/Playlists/ListPlaylistResources.tsx`](apps/web/src/components/List/Playlists/ListPlaylistResources.tsx)
- **Lines**: 48, 71, 72, 131, 136, 141
- **Issue**: Array access and object properties possibly undefined (6 errors)
- **Fix**: 
  - Add null checks for `array[index]` access
  - Check `movedResource` and `removed` before using
  - Handle undefined cases in array operations

### 3. ListQueueResources Component
- **File**: [`apps/web/src/components/List/Queues/ListQueueResources.tsx`](apps/web/src/components/List/Queues/ListQueueResources.tsx)
- **Lines**: 125, 130, 135
- **Issue**: Array access and object properties possibly undefined (6 errors)
- **Fix**: Similar to ListPlaylistResources - add null checks

### 4. SourceSelectorRow Component
- **File**: [`apps/web/src/components/SourceSelectors/SourceSelectorRow.tsx`](apps/web/src/components/SourceSelectors/SourceSelectorRow.tsx)
- **Line**: 47
- **Issue**: `source` possibly undefined
- **Fix**: Add null check before accessing `source` properties

### 5. SourceSelectors Component
- **File**: [`apps/web/src/components/SourceSelectors/SourceSelectors.tsx`](apps/web/src/components/SourceSelectors/SourceSelectors.tsx)
- **Line**: 27
- **Issue**: `labeledItemEnclosure` possibly undefined
- **Fix**: Add null check

## Implementation Notes

1. **Array Access**: Always check `array[index]` before using
2. **Optional Properties**: Use optional chaining (`?.`) or explicit checks
3. **Early Returns**: Return early if required values are undefined
4. **Default Values**: Use nullish coalescing (`??`) when appropriate
5. **Type Guards**: Consider using type guards for complex checks

## Common Patterns

```typescript
// Pattern 1: Early return
const item = array[index];
if (!item) {
  return; // or throw error, or return default
}

// Pattern 2: Nullish coalescing
const value = obj?.property ?? defaultValue;

// Pattern 3: Optional chaining
const result = obj?.nested?.property;

// Pattern 4: Type guard
if (item && item.property) {
  // use item.property
}
```

## Verification

After fixing each file:
```bash
cd apps/web && npx tsc --noEmit
```

Should see reduction in TS2532 and TS18048 errors.
