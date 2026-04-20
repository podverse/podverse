### Session 1 - 2026-04-19

#### Prompt (Developer)

implement the plan

#### Key Decisions

- Reuse and extend `useBoostMessagesView` as the shared non-add-by-RSS and add-by-RSS boost messages view model.
- Align header/list gating by threading `ssrCanShowBoosts` into podcast and episode list components.
- Keep per-medium breadcrumb URL mapping local at page list call sites while centralizing fetcher/scope wiring in the shared hook.
- Make `canShowBoostTab` derive from a non-null `boostsPageFetcher` so tab visibility and rendered content cannot drift by scope mismatch.
- Treat a provided `itemGuid` as item scope in `getBoostEligibilityForContent` to support item/track/livestream view-model calls consistently.

#### Files Modified

- .llm/history/active/boost-messages-consistency/boost-messages-consistency-part-01.md
- apps/web/src/utils/value/boostEligibility.ts
- apps/web/src/components/Boost/messages/useBoostMessagesView.ts
- apps/web/src/components/Boost/messages/getPublicBoostMessageLinkKey.ts
- apps/web/src/components/Boost/messages/useBoostMessagesSection.ts
- apps/web/src/components/Boost/messages/BoostMessagesSection.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageList.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageList.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageList.tsx
- apps/web/src/app/track/[item_id]/TrackPageList.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageList.tsx
