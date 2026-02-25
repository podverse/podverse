---
name: tracks-header-pattern
overview: Standardize track headers with Common/Core/AddByRSS header patterns.
todos:
  - id: common-track-header
    content: Create Common track header layout
    status: pending
  - id: core-track-header
    content: Refactor TrackHeader to Core + Common
    status: pending
  - id: addbyrss-track-header
    content: Add AddByRSSTrackHeader and wire into AddByRSS detail
    status: pending
isProject: false
---

# Tracks Header Components Plan

## Goal

Introduce Common/Core header layout for track headers and create an AddByRSS track header.

## Steps

1. **Create Common item header layout**
   - Add `CommonTrackHeader` (or shared CommonItem header) under `[apps/web/src/components/Common/Media/](apps/web/src/components/Common/Media/)`.

2. **Create Core track header components**
   - Refactor `[apps/web/src/components/Media/Music/Album/Track/TrackHeader.tsx](apps/web/src/components/Media/Music/Album/Track/TrackHeader.tsx)` to use `CoreTrackHeader*` under `[apps/web/src/components/Core/Media/Music/Track/](apps/web/src/components/Core/Media/Music/Track/)`.

3. **Add AddByRSS track header**
   - Create `AddByRSSTrackHeader` under `[apps/web/src/components/AddByRSS/Music/Track/](apps/web/src/components/AddByRSS/Music/Track/)` and wire into AddByRSS track detail display.

## Expected Files

- `apps/web/src/components/Common/Media/*`
- `apps/web/src/components/Core/Media/Music/Track/*`
- `apps/web/src/components/AddByRSS/Music/Track/AddByRSSTrackHeader.tsx`
- `apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx` (or track detail client)
