---
name: page-renames-episodes
overview: Rename episode page-specific components to include "Page" in the name and update imports.
todos:
  - id: episodes-list-page-renames
    content: Rename /episodes page components to Page naming
    status: pending
  - id: episodes-detail-page-renames
    content: Rename /episode/[item_id] page components to Page naming
    status: pending
isProject: false
---

# Episodes Page Component Renames

## Goal

Ensure all episode page-specific component implementations include `Page` in their names.

## Steps

1. **Rename /episodes page components**
   - `apps/web/src/app/episodes/EpisodesClient.tsx` → `EpisodesPageClient.tsx`
   - `apps/web/src/app/episodes/EpisodesHeader.tsx` → `EpisodesPageHeader.tsx`
   - `apps/web/src/app/episodes/EpisodesList.tsx` → `EpisodesPageList.tsx`
   - `apps/web/src/app/episodes/EpisodesContext.tsx` → `EpisodesPageContext.tsx`
   - `apps/web/src/app/episodes/EpisodesDropdownConfig.tsx` → `EpisodesPageDropdownConfig.tsx`
   - Update imports in `apps/web/src/app/episodes/` (including `page.tsx` and `EpisodesPageClient.tsx`).

2. **Rename /episode/[item_id] page components**
   - `apps/web/src/app/episode/[item_id]/EpisodeClient.tsx` → `EpisodePageClient.tsx`
   - `apps/web/src/app/episode/[item_id]/EpisodeList.tsx` → `EpisodePageList.tsx`
   - `apps/web/src/app/episode/[item_id]/EpisodeListHeader.tsx` → `EpisodePageListHeader.tsx`
   - `apps/web/src/app/episode/[item_id]/EpisodeContext.tsx` → `EpisodePageContext.tsx`
   - `apps/web/src/app/episode/[item_id]/EpisodeDropdownConfig.tsx` → `EpisodePageDropdownConfig.tsx`
   - Update imports in `apps/web/src/app/episode/[item_id]/` (including `page.tsx` and `EpisodePageClient.tsx`).

## Expected Files

- `apps/web/src/app/episodes/EpisodesPageClient.tsx`
- `apps/web/src/app/episodes/EpisodesPageHeader.tsx`
- `apps/web/src/app/episodes/EpisodesPageList.tsx`
- `apps/web/src/app/episodes/EpisodesPageContext.tsx`
- `apps/web/src/app/episodes/EpisodesPageDropdownConfig.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageList.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageContext.tsx`
- `apps/web/src/app/episode/[item_id]/EpisodePageDropdownConfig.tsx`
