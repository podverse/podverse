# Fix Type Assignments (TS2322, TS2345)

**Priority: MEDIUM** - Fix legitimate ones, consider alternatives for DTO mismatches.

This plan fixes ~20 TypeScript errors related to type mismatches where `string | undefined` or other optional types are being assigned to non-optional types, or where object shapes don't match expected types.

**Note**: Some of these are legitimate issues (~12 errors) that need fixing. Others are DTO object literal mismatches (~8 errors) that might be better handled by adjusting types rather than code.

## Strategy

These errors occur when:
1. `string | undefined` is assigned to `string`
2. `DTOItem | null | undefined` is assigned to `DTOItem | null`
3. Object literals don't match expected DTO types
4. Array types include `undefined` but target type doesn't allow it

**Patterns to fix:**
```typescript
// Before (error)
const str: string = value; // where value is string | undefined
const item: DTOItem | null = value; // where value is DTOItem | null | undefined

// After (fixed)
const str: string = value ?? '';
const str: string = value || '';
if (value) {
  const str: string = value;
}
const item: DTOItem | null = value ?? null;
```

## Files to Fix

### 1. Membership Page
- **File**: [`apps/web/src/app/membership/page.tsx`](apps/web/src/app/membership/page.tsx)
- **Line**: 116
- **Issue**: `styles.contactLink` is `string | undefined` but prop expects `string`
- **Fix**: Use nullish coalescing: `contactLinkClassName: styles.contactLink ?? ''`

### 2. ListChannelSettings Component
- **File**: [`apps/web/src/components/List/ListChannelSettings.tsx`](apps/web/src/components/List/ListChannelSettings.tsx)
- **Line**: 59
- **Issue**: `string | undefined` passed to function expecting `string`
- **Fix**: Add null check or default value

### 3. ListPlaylistResources Component
- **File**: [`apps/web/src/components/List/Playlists/ListPlaylistResources.tsx`](apps/web/src/components/List/Playlists/ListPlaylistResources.tsx)
- **Lines**: 48, 71, 72, 132, 137, 142
- **Issue**: 
  - `DTOPlaylistResource | undefined` passed where `DTOPlaylistResource` expected (3 errors) - **Fix these**
  - Object literal doesn't match `DTOPlaylistResource` type (3 errors) - **Consider alternatives**
- **Fix**: 
  - Add null checks before passing to functions (lines 48, 71, 72)
  - **For object literals (lines 132, 137, 142)**: Consider using `Partial<DTOPlaylistResource>` or type assertion if we know the object is valid, or ensure required fields (`id`, `playlist_id`) are included

### 4. ListQueueResources Component
- **File**: [`apps/web/src/components/List/Queues/ListQueueResources.tsx`](apps/web/src/components/List/Queues/ListQueueResources.tsx)
- **Lines**: 126, 131, 136
- **Issue**: Object literal doesn't match `DTOQueueResource` type (3 errors)
- **Fix**: 
  - **Option 1**: Ensure object literals include required properties (`id`, `playlist_id`)
  - **Option 2**: Use type assertion if we know the object is valid: `as DTOQueueResource`
  - **Option 3**: Adjust the DTO type to make `id` and `playlist_id` optional if they're not always available

### 5. TrackPreviousButton Components
- **Files**: 
  - [`apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButton.tsx`](apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButton.tsx)
  - [`apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.tsx`](apps/web/src/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.tsx)
- **Line**: 70 (both files)
- **Issue**: `DTOItem | null | undefined` assigned to `DTOItem | null`
- **Fix**: Use nullish coalescing: `value ?? null`

### 6. MediaPlayerInfoModal Component
- **File**: [`apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx`](apps/web/src/components/MediaPlayer/Modal/MediaPlayerInfoModal.tsx)
- **Lines**: 113, 119, 136, 152, 168
- **Issue**: `string | undefined` assigned to `string` (5 errors)
- **Fix**: Add null checks or default values for all string assignments

### 7. Settings Component
- **File**: [`apps/web/src/components/Settings/Settings.tsx`](apps/web/src/components/Settings/Settings.tsx)
- **Line**: 87
- **Issue**: Array includes `undefined` but type expects `TabData[]`
- **Fix**: Filter out undefined values or ensure array doesn't contain undefined

### 8. useAutoQueueLoadResources Hook
- **File**: [`apps/web/src/hooks/useAutoQueueLoadResources.tsx`](apps/web/src/hooks/useAutoQueueLoadResources.tsx)
- **Line**: 246
- **Issue**: `AutoQueueResourcesMapRow | undefined` assigned to non-optional type
- **Fix**: Add null check or handle undefined case

### 9. useLocaleDetect Hook
- **File**: [`apps/web/src/hooks/useLocaleDetect.ts`](apps/web/src/hooks/useLocaleDetect.ts)
- **Line**: 42
- **Issue**: `string | undefined` assigned to `string`
- **Fix**: Add default value or null check

### 10. itemChapter Utility
- **File**: [`apps/web/src/utils/itemChapter.ts`](apps/web/src/utils/itemChapter.ts)
- **Lines**: 31, 34
- **Issue**: `DTOItemChapter | undefined` assigned to `DTOItemChapter | null`
- **Fix**: Use nullish coalescing: `value ?? null`

## Implementation Notes

### Legitimate Fixes (Do These)
1. **String defaults**: Use `?? ''` or `|| ''` for string defaults
2. **Null coalescing**: Use `?? null` to convert `undefined` to `null`
3. **Type guards**: Check types before assignment when needed
4. **Array filtering**: Filter out `undefined` values: `array.filter((item): item is Type => item !== undefined)`

### DTO Object Literal Mismatches (Consider Alternatives)
For DTO mismatches where spreading objects loses required fields:

**Option 1**: Include required fields explicitly
```typescript
const dto: DTOPlaylistResource = {
  id: movedResource.id, // Ensure required fields are included
  playlist_id: movedResource.playlist_id,
  ...movedResource,
  list_position: updatedListPosition,
};
```

**Option 2**: Use type assertion if we know it's safe
```typescript
const dto = {
  ...movedResource,
  list_position: updatedListPosition,
} as DTOPlaylistResource;
```

**Option 3**: Adjust DTO type if fields are truly optional in this context
```typescript
// In DTO definition, make id optional if it's not always available
export interface DTOPlaylistResource {
  id?: number; // Make optional if needed
  // ...
}
```

## Common Patterns

```typescript
// Pattern 1: String default
const str: string = value ?? '';

// Pattern 2: Null conversion
const item: Type | null = value ?? null;

// Pattern 3: Type guard
if (value !== undefined) {
  const str: string = value;
}

// Pattern 4: Array filtering
const filtered = array.filter((item): item is Type => item !== undefined);

// Pattern 5: Object literal with required props
const dto: DTOType = {
  required: value,
  ...(optional ? { optional } : {}),
};
```

## Verification

After fixing each file:
```bash
cd apps/web && npx tsc --noEmit
```

Should see reduction in TS2322 and TS2345 errors.
