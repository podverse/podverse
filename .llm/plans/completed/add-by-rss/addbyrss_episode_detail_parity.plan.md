---
name: AddByRSS episode detail parity
overview: Swap the add-by-RSS episode detail page to mirror the non-add-by-RSS episode detail layout using local feed data adapters.
todos:
  - id: new-episode-client
    content: Add AddByRSSEpisodePageClient mirroring EpisodePageClient
    status: pending
  - id: local-adapter
    content: Map add-by-RSS feed/item data to DTO shape needed by episode components
    status: pending
  - id: detail-switch
    content: Wire AddByRSSDetailPageClient to new episode client and remove items list
    status: pending
  - id: verify-detail
    content: Verify episode detail parity and run web lint/tsc
    status: pending
isProject: false
---

# AddByRSS Episode Detail Parity

## Goal
Align the add-by-RSS episode detail page with the non-add-by-RSS episode detail UI, removing the embedded episodes list and using local feed data.

## Files to touch
- [apps/web/src/app/add-by-rss/episode/[id]/page.tsx](apps/web/src/app/add-by-rss/episode/[id]/page.tsx)
- [apps/web/src/app/add-by-rss/AddByRSSDetailPageClient.tsx](apps/web/src/app/add-by-rss/AddByRSSDetailPageClient.tsx)
- New client component near add-by-RSS pages (e.g. [apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx](apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx))
- Add-by-RSS episode components in [apps/web/src/components/AddByRSS/Podcast/Episode/](apps/web/src/components/AddByRSS/Podcast/Episode/)
- Reference layout: [apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx](apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx)

## Tasks
1) Create `AddByRSSEpisodePageClient` that mirrors `EpisodePageClient` structure:
   - `MainWrapper` → `CorePodcastHeader` → `MainInnerWrapper` → `SideContent` → `MainInnerContentWrapper` → `EpisodeHeader` → `EpisodePageListHeader` → `EpisodePageList`.
2) Add a small adapter to map local add-by-RSS feed/item data into the minimal DTO shape required by `CorePodcastHeader`, `EpisodeHeader`, and `EpisodePageList`.
3) Update `AddByRSSDetailPageClient` to route `resourceType === 'episodes'` to the new client and remove the local items list block for episodes.
4) Ensure styles/components match the non-add-by-RSS episode detail page.

## Verification
- Manual: open add-by-RSS episode detail page and compare layout with `/episode/[item_id]`.
- Run `npx tsc --noEmit` and `npm run lint` in `apps/web`.
