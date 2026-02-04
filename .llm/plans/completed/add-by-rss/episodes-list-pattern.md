---
name: episodes-list-pattern
overview: Apply Common/Core/AddByRSS list patterns for episodes lists and relocate AddByRSS episode list components into components/AddByRSS/Episodes.
todos:
  - id: common-episode-list
    content: Create Common episode list components
    status: pending
  - id: core-episode-list
    content: Create Core episode list components and update EpisodesList
    status: pending
  - id: addbyrss-episode-list
    content: Move AddByRSS episode list components into components/AddByRSS/Episodes
    status: pending
isProject: false
---

# Episodes List Components Plan

## Goal

Standardize episode list components to the Common/Core/AddByRSS pattern and remove app-level list component duplication.

## Steps

1. **Create Common list components**
   - Add `CommonEpisodeListRow`, `CommonEpisodeListGridNode`, `CommonEpisodeListNodes` plus `types.ts` in `[apps/web/src/components/Common/List/Episode/](apps/web/src/components/Common/List/Episode/)`.

2. **Create Core list components**
   - Add `CoreEpisodeRow`, `CoreEpisodeGridNode`, `CoreEpisodeNodes`, `CoreEpisodes` in `[apps/web/src/components/Core/List/Episode/](apps/web/src/components/Core/List/Episode/)` using the Common components.
   - Update `[apps/web/src/app/episodes/EpisodesList.tsx](apps/web/src/app/episodes/EpisodesList.tsx)` to use `CoreEpisodes`.

3. **Move AddByRSS episode list components**
   - Move list-level AddByRSS episode components from app folder:
     - `[apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeRow.tsx](apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeRow.tsx)`
     - `[apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeNodes.tsx](apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeNodes.tsx)`
     - `[apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeGridNode.tsx](apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodeGridNode.tsx)`
     into `[apps/web/src/components/AddByRSS/Episodes/](apps/web/src/components/AddByRSS/Episodes/)` and adjust imports in `[apps/web/src/components/AddByRSS/AddByRSSListClient.tsx](apps/web/src/components/AddByRSS/AddByRSSListClient.tsx)`.

4. **Ensure no conflict with podcast bundle rows**
   - Keep the podcast bundle episode components in `components/AddByRSS/Podcast/` as-is; only list-level episode feed rows move.

## Expected Files

- `apps/web/src/components/Common/List/Episode/*`
- `apps/web/src/components/Core/List/Episode/*`
- `apps/web/src/components/AddByRSS/Episodes/*`
- `apps/web/src/app/episodes/EpisodesList.tsx`
- `apps/web/src/components/AddByRSS/AddByRSSListClient.tsx`
