---
name: page-renames-add-by-rss
overview: Rename add-by-RSS page-specific components to include "Page" in the name and update imports.
todos:
  - id: addbyrss-detail-page-renames
    content: Rename shared AddByRSS detail page components to Page naming
    status: pending
isProject: false
---

# Add-by-RSS Page Component Renames

## Goal

Ensure add-by-RSS page-specific component implementations include `Page` in their names.

## Steps

1. **Rename shared AddByRSS detail client**
   - `apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx` → `AddByRSSDetailPageClient.tsx`
   - Update imports in add-by-RSS route `page.tsx` files and any other references.

2. **Verify existing Page naming**
   - Confirm `apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx` and
     `apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageListHeader.tsx` remain as-is.

## Expected Files

- `apps/web/src/app/add-by-rss/AddByRSSDetailPageClient.tsx`
