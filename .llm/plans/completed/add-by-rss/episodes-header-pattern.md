---
name: episodes-header-pattern
overview: Add Common/Core/AddByRSS header patterns for episode headers (non-AddByRSS + AddByRSS).
todos:
  - id: common-episode-header
    content: Create Common episode header layout
    status: pending
  - id: core-episode-header
    content: Refactor EpisodeHeader to Core + Common
    status: pending
  - id: addbyrss-episode-header
    content: Add AddByRSSEpisodeHeader and wire into AddByRSS detail
    status: pending
isProject: false
---

# Episodes Header Components Plan

## Goal

Standardize episode headers with Common/Core/AddByRSS patterns and introduce an AddByRSS episode header where missing.

## Steps

1. **Create Common item header layout (if not already)**
   - Add `CommonItemHeader` or episode-specific `CommonEpisodeHeader` as needed under `apps/web/src/components/Common/Media/`.

2. **Refactor Core Episode header**
   - Update `[apps/web/src/components/Media/Podcast/Episode/EpisodeHeader.tsx](apps/web/src/components/Media/Podcast/Episode/EpisodeHeader.tsx)` to use the Common header layout and introduce `CoreEpisodeHeader*` components in `[apps/web/src/components/Core/Media/Episode/](apps/web/src/components/Core/Media/Episode/)`.

3. **Add AddByRSS episode header**
   - Create `AddByRSSEpisodeHeader` under `apps/web/src/components/AddByRSS/Episodes/` and use it in AddByRSS episode detail views (likely in `[apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx](apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx)` or the episode detail client).

## Expected Files

- `apps/web/src/components/Common/Media/*` (episode/item header layout)
- `apps/web/src/components/Core/Media/Episode/*`
- `apps/web/src/components/AddByRSS/Episodes/AddByRSSEpisodeHeader.tsx`
- `apps/web/src/app/add-by-rss/*` (wiring)
