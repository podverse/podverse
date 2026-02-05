---
name: artists-list-pattern
overview: Apply Common/Core/AddByRSS list patterns for artist lists and relocate AddByRSS artist list components.
todos:
  - id: common-artist-list
    content: Create Common artist list components
    status: pending
  - id: core-artist-list
    content: Create Core artist list components and update ArtistsList
    status: pending
  - id: addbyrss-artist-list
    content: Move AddByRSS artist list components into components/AddByRSS/Music/Artist
    status: pending
isProject: false
---

# Artists List Components Plan

## Goal

Standardize artist list components to Common/Core/AddByRSS pattern.

## Steps

1. **Create Common artist list components**
   - Add `CommonArtistListRow`, `CommonArtistListGridNode`, `CommonArtistListNodes` in `[apps/web/src/components/Common/List/Artist/](apps/web/src/components/Common/List/Artist/)`.

2. **Create Core artist list components**
   - Add `CoreArtistRow`, `CoreArtistGridNode`, `CoreArtistNodes`, `CoreArtists` in `[apps/web/src/components/Core/List/Artist/](apps/web/src/components/Core/List/Artist/)`.
   - Update `[apps/web/src/app/artists/ArtistsList.tsx](apps/web/src/app/artists/ArtistsList.tsx)` to use `CoreArtists`.

3. **Move AddByRSS artist list components**
   - Move `AddByRSSArtistRow`, `AddByRSSArtistNodes`, `AddByRSSArtistGridNode` from `[apps/web/src/app/add-by-rss/artists/](apps/web/src/app/add-by-rss/artists/)` into `[apps/web/src/components/AddByRSS/Music/Artist/](apps/web/src/components/AddByRSS/Music/Artist/)` and update AddByRSS list client imports.

## Expected Files

- `apps/web/src/components/Common/List/Artist/*`
- `apps/web/src/components/Core/List/Artist/*`
- `apps/web/src/components/AddByRSS/Music/Artist/*`
- `apps/web/src/app/artists/ArtistsList.tsx`
- `apps/web/src/components/AddByRSS/AddByRSSListClient.tsx`
