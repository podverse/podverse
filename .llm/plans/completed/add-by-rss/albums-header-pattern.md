---
name: albums-header-pattern
overview: Standardize album headers with Common/Core/AddByRSS header patterns.
todos:
  - id: common-album-header
    content: Create Common album header layout
    status: pending
  - id: core-album-header
    content: Refactor AlbumHeader to Core + Common
    status: pending
  - id: addbyrss-album-header
    content: Add AddByRSSAlbumHeader and wire into AddByRSS detail
    status: pending
isProject: false
---

# Albums Header Components Plan

## Goal

Introduce Common/Core header layout for album headers and create an AddByRSS album header.

## Steps

1. **Create Common album header layout**
   - Add `CommonAlbumHeader`, `CommonAlbumHeaderViewDesktop`, `CommonAlbumHeaderViewTablet` under `[apps/web/src/components/Common/Media/Music/](apps/web/src/components/Common/Media/Music/)` (or shared CommonMusic header with Artist).

2. **Create Core album header components**
   - Refactor `[apps/web/src/components/Media/Music/Album/AlbumHeader.tsx](apps/web/src/components/Media/Music/Album/AlbumHeader.tsx)` to use `CoreAlbumHeader*` under `[apps/web/src/components/Core/Media/Music/Album/](apps/web/src/components/Core/Media/Music/Album/)`.

3. **Add AddByRSS album header**
   - Create `AddByRSSAlbumHeader` under `[apps/web/src/components/AddByRSS/Music/Album/](apps/web/src/components/AddByRSS/Music/Album/)` and wire into AddByRSS detail display for albums.

## Expected Files

- `apps/web/src/components/Common/Media/Music/*`
- `apps/web/src/components/Core/Media/Music/Album/*`
- `apps/web/src/components/AddByRSS/Music/Album/AddByRSSAlbumHeader.tsx`
- `apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx` (or album detail client)
