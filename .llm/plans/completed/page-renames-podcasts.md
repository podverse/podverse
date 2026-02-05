---
name: page-renames-podcasts
overview: Rename podcasts page-specific components to include "Page" in the name and update imports.
todos:
  - id: podcasts-list-page-renames
    content: Rename /podcasts page components to Page naming
    status: pending
  - id: podcasts-detail-page-renames
    content: Rename /podcast/[channel_id] page components to Page naming
    status: pending
isProject: false
---

# Podcasts Page Component Renames

## Goal

Ensure all podcasts page-specific component implementations include `Page` in their names.

## Steps

1. **Rename /podcasts page components**
   - `apps/web/src/app/podcasts/PodcastsContext.tsx` → `PodcastsPageContext.tsx`
   - `apps/web/src/app/podcasts/PodcastsDropdownConfig.ts` → `PodcastsPageDropdownConfig.ts`
   - Update imports in `apps/web/src/app/podcasts/` (including `page.tsx` and `PodcastsPageClient.tsx` as needed).

2. **Rename /podcast/[channel_id] page components**
   - `apps/web/src/app/podcast/[channel_id]/PodcastContext.tsx` → `PodcastPageContext.tsx`
   - `apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts` → `PodcastPageDropdownConfig.ts`
   - Update imports in `apps/web/src/app/podcast/[channel_id]/` (including `page.tsx` and `PodcastPageClient.tsx` as needed).

## Expected Files

- `apps/web/src/app/podcasts/PodcastsPageContext.tsx`
- `apps/web/src/app/podcasts/PodcastsPageDropdownConfig.ts`
- `apps/web/src/app/podcast/[channel_id]/PodcastPageContext.tsx`
- `apps/web/src/app/podcast/[channel_id]/PodcastPageDropdownConfig.ts`
