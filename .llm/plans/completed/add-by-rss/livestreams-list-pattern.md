---
name: livestreams-list-pattern
overview: Apply Common/Core/AddByRSS list patterns for livestream lists and relocate AddByRSS livestream list components.
todos:
  - id: common-livestream-list
    content: Create Common livestream list components
    status: pending
  - id: core-livestream-list
    content: Create Core livestream list components and update LivestreamsList
    status: pending
  - id: addbyrss-livestream-list
    content: Move AddByRSS livestream list components into components/AddByRSS/Livestream
    status: pending
isProject: false
---

# Livestreams List Components Plan

## Goal

Standardize livestream list components to Common/Core/AddByRSS pattern.

## Steps

1. **Create Common livestream list components**
  - Add `CommonLivestreamListRow`, `CommonLivestreamListGridNode`, `CommonLivestreamListNodes` in `[apps/web/src/components/Common/List/Livestream/](apps/web/src/components/Common/List/Livestream/)`.
2. **Create Core livestream list components**
  - Add `CoreLivestreamRow`, `CoreLivestreamGridNode`, `CoreLivestreamNodes`, `CoreLivestreams` in `[apps/web/src/components/Core/List/Livestream/](apps/web/src/components/Core/List/Livestream/)`.
  - Update `[apps/web/src/app/podcasts/livestreams/LivestreamsList.tsx](apps/web/src/app/podcasts/livestreams/LivestreamsList.tsx)` to use `CoreLivestreams`.
3. **Move AddByRSS livestream list components**
  - Move `AddByRSSLivestreamRow`, `AddByRSSLivestreamNodes`, `AddByRSSLivestreamGridNode` from `[apps/web/src/app/add-by-rss/livestreams/](apps/web/src/app/add-by-rss/livestreams/)` into `[apps/web/src/components/AddByRSS/Livestream/](apps/web/src/components/AddByRSS/Livestream/)` and update AddByRSS list client imports.

## Expected Files

- `apps/web/src/components/Common/List/Livestream/*`
- `apps/web/src/components/Core/List/Livestream/*`
- `apps/web/src/components/AddByRSS/Livestream/*`
- `apps/web/src/app/podcasts/livestreams/LivestreamsList.tsx`
- `apps/web/src/components/AddByRSS/AddByRSSListClient.tsx`
