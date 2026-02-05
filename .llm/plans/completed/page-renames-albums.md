---
name: page-renames-albums
overview: Rename album page-specific components to include "Page" in the name and update imports.
todos:
  - id: albums-list-page-renames
    content: Rename /albums page components to Page naming
    status: pending
  - id: albums-detail-page-renames
    content: Rename /album/[channel_id] page components to Page naming
    status: pending
isProject: false
---

# Albums Page Component Renames

## Goal

Ensure all album page-specific component implementations include `Page` in their names.

## Steps

1. **Rename /albums page components**
   - `apps/web/src/app/albums/AlbumsClient.tsx` → `AlbumsPageClient.tsx`
   - `apps/web/src/app/albums/AlbumsHeader.tsx` → `AlbumsPageHeader.tsx`
   - `apps/web/src/app/albums/AlbumsList.tsx` → `AlbumsPageList.tsx`
   - `apps/web/src/app/albums/AlbumsContext.tsx` → `AlbumsPageContext.tsx`
   - `apps/web/src/app/albums/AlbumsDropdownConfig.ts` → `AlbumsPageDropdownConfig.ts`
   - Update imports in `apps/web/src/app/albums/` (including `page.tsx` and `AlbumsPageClient.tsx`).

2. **Rename /album/[channel_id] page components**
   - `apps/web/src/app/album/[channel_id]/AlbumClient.tsx` → `AlbumPageClient.tsx`
   - `apps/web/src/app/album/[channel_id]/AlbumList.tsx` → `AlbumPageList.tsx`
   - `apps/web/src/app/album/[channel_id]/AlbumListHeader.tsx` → `AlbumPageListHeader.tsx`
   - `apps/web/src/app/album/[channel_id]/AlbumSideContent.tsx` → `AlbumPageSideContent.tsx`
   - `apps/web/src/app/album/[channel_id]/AlbumContext.tsx` → `AlbumPageContext.tsx`
   - `apps/web/src/app/album/[channel_id]/AlbumDropdownConfig.ts` → `AlbumPageDropdownConfig.ts`
   - Update imports in `apps/web/src/app/album/[channel_id]/` (including `page.tsx` and `AlbumPageClient.tsx`).

## Expected Files

- `apps/web/src/app/albums/AlbumsPageClient.tsx`
- `apps/web/src/app/albums/AlbumsPageHeader.tsx`
- `apps/web/src/app/albums/AlbumsPageList.tsx`
- `apps/web/src/app/albums/AlbumsPageContext.tsx`
- `apps/web/src/app/albums/AlbumsPageDropdownConfig.ts`
- `apps/web/src/app/album/[channel_id]/AlbumPageClient.tsx`
- `apps/web/src/app/album/[channel_id]/AlbumPageList.tsx`
- `apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx`
- `apps/web/src/app/album/[channel_id]/AlbumPageSideContent.tsx`
- `apps/web/src/app/album/[channel_id]/AlbumPageContext.tsx`
- `apps/web/src/app/album/[channel_id]/AlbumPageDropdownConfig.ts`
