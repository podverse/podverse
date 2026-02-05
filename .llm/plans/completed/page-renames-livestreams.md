---
name: page-renames-livestreams
overview: Rename livestream page-specific components to include "Page" in the name and update imports.
todos:
  - id: livestreams-list-page-renames
    content: Rename /podcasts/livestreams page components to Page naming
    status: pending
  - id: livestreams-detail-page-renames
    content: Rename /podcast/livestream/[item_id] page components to Page naming
    status: pending
isProject: false
---

# Livestreams Page Component Renames

## Goal

Ensure all livestream page-specific component implementations include `Page` in their names.

## Steps

1. **Rename /podcasts/livestreams page components**
   - `apps/web/src/app/podcasts/livestreams/LivestreamsClient.tsx` → `LivestreamsPageClient.tsx`
   - `apps/web/src/app/podcasts/livestreams/LivestreamsHeader.tsx` → `LivestreamsPageHeader.tsx`
   - `apps/web/src/app/podcasts/livestreams/LivestreamsList.tsx` → `LivestreamsPageList.tsx`
   - `apps/web/src/app/podcasts/livestreams/LivestreamsContext.tsx` → `LivestreamsPageContext.tsx`
   - `apps/web/src/app/podcasts/livestreams/LivestreamsDropdownConfig.tsx` → `LivestreamsPageDropdownConfig.tsx`
   - Update imports in `apps/web/src/app/podcasts/livestreams/` (including `page.tsx` and `LivestreamsPageClient.tsx`).

2. **Rename /podcast/livestream/[item_id] page components**
   - `apps/web/src/app/podcast/livestream/[item_id]/LivestreamClient.tsx` → `LivestreamPageClient.tsx`
   - `apps/web/src/app/podcast/livestream/[item_id]/LivestreamList.tsx` → `LivestreamPageList.tsx`
   - `apps/web/src/app/podcast/livestream/[item_id]/LivestreamListHeader.tsx` → `LivestreamPageListHeader.tsx`
   - `apps/web/src/app/podcast/livestream/[item_id]/LivestreamContext.tsx` → `LivestreamPageContext.tsx`
   - `apps/web/src/app/podcast/livestream/[item_id]/LivestreamDropdownConfig.tsx` → `LivestreamPageDropdownConfig.tsx`
   - Update imports in `apps/web/src/app/podcast/livestream/[item_id]/` (including `page.tsx` and `LivestreamPageClient.tsx`).

## Expected Files

- `apps/web/src/app/podcasts/livestreams/LivestreamsPageClient.tsx`
- `apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx`
- `apps/web/src/app/podcasts/livestreams/LivestreamsPageList.tsx`
- `apps/web/src/app/podcasts/livestreams/LivestreamsPageContext.tsx`
- `apps/web/src/app/podcasts/livestreams/LivestreamsPageDropdownConfig.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageClient.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageList.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageListHeader.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageContext.tsx`
- `apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageDropdownConfig.tsx`
