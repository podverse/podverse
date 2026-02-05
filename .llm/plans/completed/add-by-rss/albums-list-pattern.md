---
name: albums-list-pattern
overview: Apply Common/Core/AddByRSS list patterns for album lists and relocate AddByRSS album list components.
todos:
  - id: common-album-list
    content: Create Common album list components
    status: pending
  - id: core-album-list
    content: Create Core album list components and update AlbumsList
    status: pending
  - id: addbyrss-album-list
    content: Move AddByRSS album list components into components/AddByRSS/Music/Album
    status: pending
isProject: false
---

# Albums List Components Plan

## Goal

Standardize album list components to Common/Core/AddByRSS pattern.

## Steps

1. **Create Common album list components**
   - Add `CommonAlbumListRow`, `CommonAlbumListGridNode`, `CommonAlbumListNodes` in `[apps/web/src/components/Common/List/Album/](apps/web/src/components/Common/List/Album/)`.

2. **Create Core album list components**
   - Add `CoreAlbumRow`, `CoreAlbumGridNode`, `CoreAlbumNodes`, `CoreAlbums` in `[apps/web/src/components/Core/List/Album/](apps/web/src/components/Core/List/Album/)`.
   - Update `[apps/web/src/app/albums/AlbumsList.tsx](apps/web/src/app/albums/AlbumsList.tsx)` to use `CoreAlbums`.

3. **Move AddByRSS album list components**
   - Move `AddByRSSAlbumRow`, `AddByRSSAlbumNodes`, `AddByRSSAlbumGridNode` from `[apps/web/src/app/add-by-rss/albums/](apps/web/src/app/add-by-rss/albums/)` into `[apps/web/src/components/AddByRSS/Music/Album/](apps/web/src/components/AddByRSS/Music/Album/)` and update AddByRSS list client imports.

## Expected Files

- `apps/web/src/components/Common/List/Album/*`
- `apps/web/src/components/Core/List/Album/*`
- `apps/web/src/components/AddByRSS/Music/Album/*`
- `apps/web/src/app/albums/AlbumsList.tsx`
- `apps/web/src/components/AddByRSS/AddByRSSListClient.tsx`
