---
name: artists-header-pattern
overview: Standardize artist headers with Common/Core/AddByRSS header patterns.
todos:
  - id: common-artist-header
    content: Create Common artist header layout
    status: pending
  - id: core-artist-header
    content: Refactor ArtistHeader to Core + Common
    status: pending
  - id: addbyrss-artist-header
    content: Add AddByRSSArtistHeader and wire into AddByRSS detail
    status: pending
isProject: false
---

# Artists Header Components Plan

## Goal

Introduce Common/Core header layout for artist headers and create an AddByRSS artist header.

## Steps

1. **Create Common music header layout**
   - Add `CommonArtistHeader`, `CommonArtistHeaderViewDesktop`, `CommonArtistHeaderViewTablet` under `[apps/web/src/components/Common/Media/Music/](apps/web/src/components/Common/Media/Music/)` (or a shared CommonMusic header if reused by albums).

2. **Create Core artist header components**
   - Refactor `[apps/web/src/components/Media/Music/Artist/ArtistHeader.tsx](apps/web/src/components/Media/Music/Artist/ArtistHeader.tsx)` to use `CoreArtistHeader*` under `[apps/web/src/components/Core/Media/Music/Artist/](apps/web/src/components/Core/Media/Music/Artist/)`.

3. **Add AddByRSS artist header**
   - Create `AddByRSSArtistHeader` under `[apps/web/src/components/AddByRSS/Music/Artist/](apps/web/src/components/AddByRSS/Music/Artist/)` and wire into AddByRSS detail display for artists.

## Expected Files

- `apps/web/src/components/Common/Media/Music/*`
- `apps/web/src/components/Core/Media/Music/Artist/*`
- `apps/web/src/components/AddByRSS/Music/Artist/AddByRSSArtistHeader.tsx`
- `apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx` (or artist detail client)
