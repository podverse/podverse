# 02 — Shared section cards and row mappers

## Objective

Remove repeated card-shell styles and duplicate DTO→row mapper functions.

## Targets

- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `apps/mobile/src/screens/profile/MyProfileScreen.tsx`
- `apps/mobile/src/screens/library/PlaylistDetailScreen.tsx`
- `apps/mobile/src/screens/library/LibraryMyClipsScreen.tsx`
- `apps/mobile/src/screens/library/LibraryQueueScreen.tsx`
- `apps/mobile/src/screens/library/LibraryHistoryScreen.tsx`

## Planned extractions

1. Create reusable `SectionCard` component:
   - Standard card shell + heading + body slot.
2. Create shared row-mapper utilities in `apps/mobile/src/lib/rows/`:
   - `channelToHomeRow`
   - `clipToHomeRow`
   - `itemToHomeRow`
   - playlist/queue-specific adapters where applicable.
3. Create optional `ListSection` helper to reduce map/empty pattern boilerplate.

## Acceptance criteria

- Duplicate mapper functions removed from profile/library screens.
- Card style duplication materially reduced (single source used in major screens).
- Existing user-visible rendering stays consistent with current layout intent.
