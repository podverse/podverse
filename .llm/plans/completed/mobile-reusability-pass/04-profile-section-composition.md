# 04 — Profile section composition reuse

## Objective

Unify Public Profile and My Profile screen composition through reusable section components/hooks.

## Targets

- `apps/mobile/src/screens/profile/ProfileScreen.tsx`
- `apps/mobile/src/screens/profile/MyProfileScreen.tsx`

## Planned extractions

1. Create reusable profile content section component(s):
   - podcast/albums/clips list sections
   - playlist summary row section
2. Create `useProfileContentLoad` hook family:
   - public profile content loader
   - my profile content loader
   - shared state shape (`isLoading`, `errorKey`, content bundles)
3. Keep page-specific differences (public account lookup vs self account) as thin wrappers.

## Acceptance criteria

- Profile and MyProfile become thin composition layers.
- Shared profile section rendering used by both screens.
- No loss of existing route behavior and testIDs.
