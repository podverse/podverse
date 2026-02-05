---
name: tracks-list-pattern
overview: Apply Common/Core/AddByRSS list patterns for track lists and relocate AddByRSS track list components.
todos:
  - id: common-track-list
    content: Create Common track list components
    status: pending
  - id: core-track-list
    content: Create Core track list components and update TracksList
    status: pending
  - id: addbyrss-track-list
    content: Move AddByRSS track list components into components/AddByRSS/Music/Track
    status: pending
isProject: false
---

# Tracks List Components Plan

## Goal

Standardize track list components to Common/Core/AddByRSS pattern.

## Steps

1. **Create Common track list components**
   - Add `CommonTrackListRow`, `CommonTrackListGridNode`, `CommonTrackListNodes` in `[apps/web/src/components/Common/List/Track/](apps/web/src/components/Common/List/Track/)`.

2. **Create Core track list components**
   - Add `CoreTrackRow`, `CoreTrackGridNode`, `CoreTrackNodes`, `CoreTracks` in `[apps/web/src/components/Core/List/Track/](apps/web/src/components/Core/List/Track/)`.
   - Update `[apps/web/src/app/tracks/TracksList.tsx](apps/web/src/app/tracks/TracksList.tsx)` to use `CoreTracks`.

3. **Move AddByRSS track list components**
   - Move `AddByRSSTrackRow`, `AddByRSSTrackNodes`, `AddByRSSTrackGridNode` from `[apps/web/src/app/add-by-rss/tracks/](apps/web/src/app/add-by-rss/tracks/)` into `[apps/web/src/components/AddByRSS/Music/Track/](apps/web/src/components/AddByRSS/Music/Track/)` and update AddByRSS list client imports.

## Expected Files

- `apps/web/src/components/Common/List/Track/*`
- `apps/web/src/components/Core/List/Track/*`
- `apps/web/src/components/AddByRSS/Music/Track/*`
- `apps/web/src/app/tracks/TracksList.tsx`
- `apps/web/src/components/AddByRSS/AddByRSSListClient.tsx`
