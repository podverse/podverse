# Fix Computed Property Names (TS2464)

This plan fixes 18 TypeScript errors related to computed property names when accessing CSS module classes. With `noUncheckedIndexedAccess: true`, TypeScript requires type assertions for dynamic property access.

## Strategy

When accessing CSS module classes dynamically (e.g., `styles[variant]`), TypeScript can't guarantee the property exists. We need to add type assertions to tell TypeScript these are valid keys.

**Pattern to fix:**
```typescript
// Before (error)
styles[variant]
{ [styles.disabled]: condition }

// After (fixed)
styles[variant as keyof typeof styles]
{ [styles.disabled as keyof typeof styles]: condition }
```

## Files to Fix

### 1. Button Component
- **File**: [`apps/web/src/components/Button/Button.tsx`](apps/web/src/components/Button/Button.tsx)
- **Lines**: 76, 93
- **Issue**: `styles[variant]` and `styles.invisible` in computed property names
- **Fix**: Add `as keyof typeof styles` assertions

### 2. Divider Component
- **File**: [`apps/web/src/components/Divider/Divider.tsx`](apps/web/src/components/Divider/Divider.tsx)
- **Line**: 12
- **Issue**: `styles.dividerWithSpacing` in computed property name
- **Fix**: Add type assertion

### 3. DropdownMenu Component
- **File**: [`apps/web/src/components/Dropdown/DropdownMenu.tsx`](apps/web/src/components/Dropdown/DropdownMenu.tsx)
- **Lines**: 79, 80
- **Issue**: Dynamic class name access
- **Fix**: Add type assertions

### 4. TextInput Component
- **File**: [`apps/web/src/components/Form/TextInput.tsx`](apps/web/src/components/Form/TextInput.tsx)
- **Lines**: 90, 91, 120, 155, 156
- **Issue**: Multiple computed property names for CSS classes
- **Fix**: Add type assertions for all dynamic class access

### 5. PlaybackModeButton Component
- **File**: [`apps/web/src/components/MediaPlayer/Buttons/PlaybackModeButton.tsx`](apps/web/src/components/MediaPlayer/Buttons/PlaybackModeButton.tsx)
- **Line**: 17
- **Issue**: Dynamic class name access
- **Fix**: Add type assertion

### 6. MediaPlayerLivestreamVideoPortalFloating Component
- **File**: [`apps/web/src/components/MediaPlayer/Controller/LiveStream/MediaPlayerLivestreamVideoPortalFloating.tsx`](apps/web/src/components/MediaPlayer/Controller/LiveStream/MediaPlayerLivestreamVideoPortalFloating.tsx)
- **Lines**: 38, 39
- **Issue**: Dynamic class name access
- **Fix**: Add type assertions

### 7. MediaPlayerVideoPortalFloating Component
- **File**: [`apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx`](apps/web/src/components/MediaPlayer/Controller/Video/MediaPlayerVideoPortalFloating.tsx)
- **Lines**: 23, 24
- **Issue**: Dynamic class name access
- **Fix**: Add type assertions

### 8. MoreButton Component
- **File**: [`apps/web/src/components/MoreButton/MoreButton.tsx`](apps/web/src/components/MoreButton/MoreButton.tsx)
- **Line**: 47
- **Issue**: Dynamic class name access
- **Fix**: Add type assertion

### 9. Tab Component
- **File**: [`apps/web/src/components/Tabs/Tab.tsx`](apps/web/src/components/Tabs/Tab.tsx)
- **Lines**: 17, 18
- **Issue**: Dynamic class name access
- **Fix**: Add type assertions

## Implementation Notes

1. Use `as keyof typeof styles` for CSS module class access
2. Ensure the assertion is safe (the key should exist at runtime)
3. Test that components still render correctly after changes
4. **Consider creating utility functions to reduce repetition** (see below)

## Alternative: Utility Functions (Recommended)

To reduce repetition, consider creating a utility function:

```typescript
// utils/cssModules.ts
export function getStyleClass<T extends Record<string, string>>(
  styles: T,
  key: keyof T
): string {
  return styles[key] ?? '';
}

// Usage:
className={classNames(
  styles.button,
  getStyleClass(styles, variant),
  { [getStyleClass(styles, 'disabled')]: disabled || isLoading },
  className,
)}
```

Or a type helper:

```typescript
type StyleKey<T> = keyof T & string;

// Usage:
styles[variant as StyleKey<typeof styles>]
```

This reduces repetition while maintaining type safety.

## Verification

After fixing each file:
```bash
cd apps/web && npx tsc --noEmit
```

Should see reduction in TS2464 errors.
