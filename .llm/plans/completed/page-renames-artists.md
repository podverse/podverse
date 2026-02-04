---
name: page-renames-artists
overview: Rename artist page-specific components to include "Page" in the name and update imports.
todos:
  - id: artists-list-page-renames
    content: Rename /artists page components to Page naming
    status: pending
  - id: artists-detail-page-renames
    content: Rename /artist/[channel_id] page components to Page naming
    status: pending
isProject: false
---

# Artists Page Component Renames

## Goal

Ensure all artist page-specific component implementations include `Page` in their names.

## Steps

1. **Rename /artists page components**
   - `apps/web/src/app/artists/ArtistsClient.tsx` → `ArtistsPageClient.tsx`
   - `apps/web/src/app/artists/ArtistsHeader.tsx` → `ArtistsPageHeader.tsx`
   - `apps/web/src/app/artists/ArtistsList.tsx` → `ArtistsPageList.tsx`
   - `apps/web/src/app/artists/ArtistsContext.tsx` → `ArtistsPageContext.tsx`
   - `apps/web/src/app/artists/ArtistsDropdownConfig.ts` → `ArtistsPageDropdownConfig.ts`
   - Update imports in `apps/web/src/app/artists/` (including `page.tsx` and `ArtistsPageClient.tsx`).

2. **Rename /artist/[channel_id] page components**
   - `apps/web/src/app/artist/[channel_id]/ArtistClient.tsx` → `ArtistPageClient.tsx`
   - `apps/web/src/app/artist/[channel_id]/ArtistList.tsx` → `ArtistPageList.tsx`
   - `apps/web/src/app/artist/[channel_id]/ArtistListHeader.tsx` → `ArtistPageListHeader.tsx`
   - `apps/web/src/app/artist/[channel_id]/ArtistSideContent.tsx` → `ArtistPageSideContent.tsx`
   - `apps/web/src/app/artist/[channel_id]/ArtistContext.tsx` → `ArtistPageContext.tsx`
   - `apps/web/src/app/artist/[channel_id]/ArtistDropdownConfig.ts` → `ArtistPageDropdownConfig.ts`
   - Update imports in `apps/web/src/app/artist/[channel_id]/` (including `page.tsx` and `ArtistPageClient.tsx`).

## Expected Files

- `apps/web/src/app/artists/ArtistsPageClient.tsx`
- `apps/web/src/app/artists/ArtistsPageHeader.tsx`
- `apps/web/src/app/artists/ArtistsPageList.tsx`
- `apps/web/src/app/artists/ArtistsPageContext.tsx`
- `apps/web/src/app/artists/ArtistsPageDropdownConfig.ts`
- `apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx`
- `apps/web/src/app/artist/[channel_id]/ArtistPageList.tsx`
- `apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx`
- `apps/web/src/app/artist/[channel_id]/ArtistPageSideContent.tsx`
- `apps/web/src/app/artist/[channel_id]/ArtistPageContext.tsx`
- `apps/web/src/app/artist/[channel_id]/ArtistPageDropdownConfig.ts`
