### Session 1 - 2026-05-06

#### Prompt (Developer)

implement the plan

(Context: opt-in skeleton flash via SkeletonFlashImage wrapper; branding stays on plain Image.)

#### Key Decisions

- Export `ImageProps` with `enableSkeletonFlash` (default false) and optional `onLoad`; skeleton class only when flash enabled and not yet loaded (`chainId` / `attemptIndex` resets).
- Add `SkeletonFlashImage` wrapper (`enableSkeletonFlash`); migrate artwork imports from `Image` (bulk replace path + multiline JSX tags).
- Keep `NavBarBrand`, `FooterBrand`, `SideBarBrand` on `Image` from `Image/Image`.

#### Files Created/Modified

- apps/web/src/components/Image/Image.tsx
- apps/web/src/components/Image/SkeletonFlashImage.tsx (new)
- apps/web/src/components/Image/ImagesPerView.tsx
- apps/web/src/components/AddByRSS/Artist/AddByRSSArtistHeader.tsx
- apps/web/src/components/AddByRSS/Artist/Album/AddByRSSAlbumHeader.tsx
- apps/web/src/components/AddByRSS/Detail/AddByRSSDetailClient.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamFeedGridNode.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamGridNode.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridCard.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridNode.tsx
- apps/web/src/components/Common/Artist/Album/CommonAlbumGridNode.tsx
- apps/web/src/components/Common/Artist/Album/CommonAlbumRow.tsx
- apps/web/src/components/Common/Artist/Album/Track/CommonTrackGridNode.tsx
- apps/web/src/components/Common/Artist/Album/Track/CommonTrackGridNodeSimple.tsx
- apps/web/src/components/Common/Artist/CommonArtistGridNode.tsx
- apps/web/src/components/Common/Artist/CommonArtistRow.tsx
- apps/web/src/components/Common/Item/CommonItemHeader.tsx
- apps/web/src/components/Common/Media/CommonChannelHeaderImage.tsx
- apps/web/src/components/Common/Podcast/CommonPodcastGridNode.tsx
- apps/web/src/components/Common/Podcast/CommonPodcastRow.tsx
- apps/web/src/components/Common/Podcast/Episode/CommonEpisodeGridNode.tsx
- apps/web/src/components/Content/Podroll/ContentPodrollChannelRow.tsx
- apps/web/src/components/Content/Podroll/ContentPodrollChannelUnaddedRow.tsx
- apps/web/src/components/Content/Podroll/ContentPodrollItemRow.tsx
- apps/web/src/components/Content/Podroll/ContentPodrollItemUnaddedRow.tsx
- apps/web/src/components/List/LiveItem/ListLiveItemGridNode.tsx
- apps/web/src/components/List/Music/Albums/ListAlbumGridNode.tsx
- apps/web/src/components/List/Music/Albums/ListAlbumGridNodeUnadded.tsx
- apps/web/src/components/List/Music/Albums/ListAlbumRow.tsx
- apps/web/src/components/List/Music/Albums/ListAlbumRowRemoteItemUnadded.tsx
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackGridNode.tsx
- apps/web/src/components/List/Music/Albums/Tracks/ListTrackGridNodeUnadded.tsx
- apps/web/src/components/List/Music/Artists/ListArtistGridNode.tsx
- apps/web/src/components/List/Music/Artists/ListArtistRow.tsx
- apps/web/src/components/List/Podcasts/Episodes/ListEpisodeGridNode.tsx
- apps/web/src/components/List/SearchResults/ListSearchResultPodcastIndexFeedRow.tsx
- apps/web/src/components/MediaHeaderMini/MediaHeaderMini.tsx
- apps/web/src/components/PodcastIndex/PodcastIndexFeedInfo.tsx
