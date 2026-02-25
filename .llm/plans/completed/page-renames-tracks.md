---
name: page-renames-tracks
overview: Rename track page-specific components to include "Page" in the name and update imports.
todos:
  - id: tracks-list-page-renames
    content: Rename /tracks page components to Page naming
    status: pending
  - id: tracks-detail-page-renames
    content: Rename /track/[item_id] page components to Page naming
    status: pending
isProject: false
---

# Tracks Page Component Renames

## Goal

Ensure all track page-specific component implementations include `Page` in their names.

## Steps

1. **Rename /tracks page components**
   - `apps/web/src/app/tracks/TracksClient.tsx` → `TracksPageClient.tsx`
   - `apps/web/src/app/tracks/TracksHeader.tsx` → `TracksPageHeader.tsx`
   - `apps/web/src/app/tracks/TracksList.tsx` → `TracksPageList.tsx`
   - `apps/web/src/app/tracks/TracksContext.tsx` → `TracksPageContext.tsx`
   - `apps/web/src/app/tracks/TracksDropdownConfig.tsx` → `TracksPageDropdownConfig.tsx`
   - Update imports in `apps/web/src/app/tracks/` (including `page.tsx` and `TracksPageClient.tsx`).

2. **Rename /track/[item_id] page components**
   - `apps/web/src/app/track/[item_id]/TrackClient.tsx` → `TrackPageClient.tsx`
   - `apps/web/src/app/track/[item_id]/TrackList.tsx` → `TrackPageList.tsx`
   - `apps/web/src/app/track/[item_id]/TrackListHeader.tsx` → `TrackPageListHeader.tsx`
   - `apps/web/src/app/track/[item_id]/TrackContext.tsx` → `TrackPageContext.tsx`
   - `apps/web/src/app/track/[item_id]/TrackDropdownConfig.tsx` → `TrackPageDropdownConfig.tsx`
   - Update imports in `apps/web/src/app/track/[item_id]/` (including `page.tsx` and `TrackPageClient.tsx`).

## Expected Files

- `apps/web/src/app/tracks/TracksPageClient.tsx`
- `apps/web/src/app/tracks/TracksPageHeader.tsx`
- `apps/web/src/app/tracks/TracksPageList.tsx`
- `apps/web/src/app/tracks/TracksPageContext.tsx`
- `apps/web/src/app/tracks/TracksPageDropdownConfig.tsx`
- `apps/web/src/app/track/[item_id]/TrackPageClient.tsx`
- `apps/web/src/app/track/[item_id]/TrackPageList.tsx`
- `apps/web/src/app/track/[item_id]/TrackPageListHeader.tsx`
- `apps/web/src/app/track/[item_id]/TrackPageContext.tsx`
- `apps/web/src/app/track/[item_id]/TrackPageDropdownConfig.tsx`
