---
name: livestreams-header-pattern
overview: Standardize livestream headers with Common/Core/AddByRSS header patterns.
todos:
  - id: common-livestream-header
    content: Create Common livestream header layout
    status: pending
  - id: core-livestream-header
    content: Refactor LivestreamHeader to Core + Common
    status: pending
  - id: addbyrss-livestream-header
    content: Add AddByRSSLivestreamHeader and wire into AddByRSS detail
    status: pending
isProject: false
---

# Livestreams Header Components Plan

## Goal

Introduce Common/Core header layout for livestream headers and create an AddByRSS livestream header.

## Steps

1. **Create Common item header layout**
   - Add `CommonLivestreamHeader` (or shared CommonItem header) under `[apps/web/src/components/Common/Media/](apps/web/src/components/Common/Media/)`.

2. **Create Core livestream header components**
   - Refactor `[apps/web/src/components/Media/Livestream/LivestreamHeader.tsx](apps/web/src/components/Media/Livestream/LivestreamHeader.tsx)` to use `CoreLivestreamHeader*` under `[apps/web/src/components/Core/Media/Livestream/](apps/web/src/components/Core/Media/Livestream/)`.

3. **Add AddByRSS livestream header**
   - Create `AddByRSSLivestreamHeader` under `[apps/web/src/components/AddByRSS/Livestream/](apps/web/src/components/AddByRSS/Livestream/)` and wire into AddByRSS livestream detail display.

## Expected Files

- `apps/web/src/components/Common/Media/*`
- `apps/web/src/components/Core/Media/Livestream/*`
- `apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamHeader.tsx`
- `apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx` (or livestream detail client)
