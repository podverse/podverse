### Session 1 - 2026-02-05

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Store Add-by-RSS livestream idText mappings in a dedicated IndexedDB store.
- Render Add-by-RSS livestream items as separate nodes above episode/track lists on page 1.
- Route Add-by-RSS livestream detail pages by live-item idText and reuse Add-by-RSS headers.
- Implement Add-by-RSS livestream rows/grids with Common live item styling and placeholder actions.

#### Files Modified

- apps/web/src/app/add-by-rss/album/AddByRSSAlbumPageClient.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageClient.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageList.tsx
- apps/web/src/app/add-by-rss/livestream/AddByRSSLivestreamItemPageClient.tsx
- apps/web/src/app/add-by-rss/music/livestream/[id]/page.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/app/add-by-rss/podcast/livestream/[id]/page.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamItemDetailHeader.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamItemGridNode.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamItemNodes.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamItemRow.tsx
- apps/web/src/utils/addByRSS/itemIndex.ts
- apps/web/src/utils/addByRSS/itemPath.ts
- apps/web/src/utils/addByRSS/storage.ts
- apps/web/src/utils/addByRSS/types.ts
