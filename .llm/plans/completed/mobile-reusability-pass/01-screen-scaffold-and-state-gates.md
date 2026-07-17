# 01 — Screen scaffold and state gates

## Objective

Extract shared mobile screen primitives for consistent scaffold/state rendering.

## Targets

- `apps/mobile/src/screens/library/LibraryPlaylistsScreen.tsx`
- `apps/mobile/src/screens/library/LibraryMyClipsScreen.tsx`
- `apps/mobile/src/screens/library/LibraryHistoryScreen.tsx`
- `apps/mobile/src/screens/library/LibraryQueueScreen.tsx`
- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `apps/mobile/src/screens/profile/MyProfileScreen.tsx`
- `apps/mobile/src/screens/rss/AddByRssRootScreen.tsx`

## Planned extractions

1. Create reusable `MobileScreenContainer` component:
   - Handles background color, content padding, heading text, optional testID.
2. Create reusable `AuthAwareLoadState` renderer:
   - Encapsulates `isLoading` / `errorKey` / auth-required / empty fallback rendering.
3. Create lightweight `RetryableError` wrapper for consistent retry behavior signatures.

## Acceptance criteria

- At least four screens consume `MobileScreenContainer`.
- At least four screens consume shared state-gate rendering helper/component.
- No behavior regressions; existing testIDs preserved.

## Notes

- Keep hooks and components small/composable.
- Do not mix queue/profile/rss-specific logic into generic primitives.
