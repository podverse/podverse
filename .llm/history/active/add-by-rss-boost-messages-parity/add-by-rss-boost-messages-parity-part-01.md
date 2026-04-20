### Session 1 - 2026-04-19

#### Prompt (Developer)

Add-by-RSS Boost Messages Parity

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Follow plan to implement Add-by-RSS Boost messages parity in strict to-do order.
- Add a shared `useBoostMessagesView` hook to centralize eligibility, guarded page fetcher creation, breadcrumb resolver setup, and global refresh trigger wiring.
- Extend `getBoostEligibilityForContent` with optional `itemGuid` so Add-by-RSS item pages can reuse shared gating without type assertions.
- Extend `createMbrssBoostBreadcrumbLinkResolver` with optional `resolveItemIdTextByGuid` for Add-by-RSS local index resolution instead of API channel item lookups.
- Wire Boosts tab + `BoostMessagesSection` into Add-by-RSS podcast/artist/album/episode/track/livestream detail clients with Add-by-RSS-specific route resolvers.
- Add query-string `type` state round-trip for Add-by-RSS detail tabs so `type=boosts` works and remains stable.

#### Files Modified

- .llm/history/active/add-by-rss-boost-messages-parity/add-by-rss-boost-messages-parity-part-01.md
- apps/web/src/components/Boost/messages/useBoostMessagesView.ts
- apps/web/src/components/Boost/messages/createMbrssBoostBreadcrumbLinkResolver.ts
- apps/web/src/utils/value/boostEligibility.ts
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/app/add-by-rss/album/AddByRSSAlbumPageListHeader.tsx
- apps/web/src/app/add-by-rss/album/AddByRSSAlbumPageClient.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageListHeader.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageList.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageClient.tsx
- apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx
- apps/web/src/app/add-by-rss/track/AddByRSSTrackItemPageClient.tsx
- apps/web/src/app/add-by-rss/livestream/AddByRSSLivestreamItemPageClient.tsx
