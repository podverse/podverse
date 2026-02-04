# Feature: add-by-rss-feeds (Part 12)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 131,
> create `add-by-rss-feeds-part-13.md`.

## Metadata

- Started: 2026-02-03
- Completed: In Progress
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Refresh add-by-RSS subscribe state using auth/me.

## Sessions

### Session 121 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Reorganized Common/Core components into medium-based directories mirroring AddByRSS.
- Relocated shared list headers under `Common/Podcast/List/Header` and shared item header under `Common/Episodes/Media`.
- Updated app and AddByRSS imports to the new Common/Core paths.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-12.md
- apps/web/src/app/HomePageHeader.tsx
- apps/web/src/app/HomePageList.tsx
- apps/web/src/app/albums/AlbumsPageHeader.tsx
- apps/web/src/app/albums/AlbumsPageList.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx
- apps/web/src/app/artists/ArtistsPageHeader.tsx
- apps/web/src/app/artists/ArtistsPageList.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx
- apps/web/src/app/chapter/[item_chapter_id_text]/ChapterClient.tsx
- apps/web/src/app/clip/[clip_id]/ClipPageClient.tsx
- apps/web/src/app/episodes/EpisodesPageHeader.tsx
- apps/web/src/app/episodes/EpisodesPageList.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx
- apps/web/src/app/my-profile/MyProfilePageContentList.tsx
- apps/web/src/app/official-clip/[item_soundbite_id]/OfficialClipClient.tsx
- apps/web/src/app/podcasts/PodcastsPageHeader.tsx
- apps/web/src/app/podcasts/PodcastsPageList.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsPageList.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageClient.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageListHeader.tsx
- apps/web/src/app/profile/[id_text]/ProfilePageContentList.tsx
- apps/web/src/app/tracks/TracksPageHeader.tsx
- apps/web/src/app/tracks/TracksPageList.tsx
- apps/web/src/app/track/[item_id]/TrackPageListHeader.tsx
- apps/web/src/components/AddByRSS/Episodes/AddByRSSEpisodeHeader.tsx
- apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamHeader.tsx
- apps/web/src/components/AddByRSS/Music/Album/AddByRSSAlbumHeader.tsx
- apps/web/src/components/AddByRSS/Music/Artist/AddByRSSArtistHeader.tsx
- apps/web/src/components/AddByRSS/Music/Track/AddByRSSTrackHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastListNodes.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/components/Common/Episodes/List/CommonEpisodeListGridNode.tsx
- apps/web/src/components/Common/Episodes/List/CommonEpisodeListNodes.tsx
- apps/web/src/components/Common/Episodes/List/CommonEpisodeListRow.tsx
- apps/web/src/components/Common/Episodes/List/types.ts
- apps/web/src/components/Common/Episodes/Media/CommonItemHeader.tsx
- apps/web/src/components/Common/Livestream/List/CommonLivestreamListGridNode.tsx
- apps/web/src/components/Common/Livestream/List/CommonLivestreamListNodes.tsx
- apps/web/src/components/Common/Livestream/List/CommonLivestreamListRow.tsx
- apps/web/src/components/Common/Music/Album/List/CommonAlbumListGridNode.tsx
- apps/web/src/components/Common/Music/Album/List/CommonAlbumListNodes.tsx
- apps/web/src/components/Common/Music/Album/List/CommonAlbumListRow.tsx
- apps/web/src/components/Common/Music/Album/List/types.ts
- apps/web/src/components/Common/Music/Album/Media/CommonAlbumHeader.tsx
- apps/web/src/components/Common/Music/Album/Media/CommonAlbumHeaderViewDesktop.tsx
- apps/web/src/components/Common/Music/Album/Media/CommonAlbumHeaderViewTablet.tsx
- apps/web/src/components/Common/Music/Artist/List/CommonArtistListGridNode.tsx
- apps/web/src/components/Common/Music/Artist/List/CommonArtistListNodes.tsx
- apps/web/src/components/Common/Music/Artist/List/CommonArtistListRow.tsx
- apps/web/src/components/Common/Music/Artist/List/types.ts
- apps/web/src/components/Common/Music/Artist/Media/CommonArtistHeader.tsx
- apps/web/src/components/Common/Music/Artist/Media/CommonArtistHeaderViewDesktop.tsx
- apps/web/src/components/Common/Music/Artist/Media/CommonArtistHeaderViewTablet.tsx
- apps/web/src/components/Common/Music/Track/List/CommonTrackListGridNode.tsx
- apps/web/src/components/Common/Music/Track/List/CommonTrackListNodes.tsx
- apps/web/src/components/Common/Music/Track/List/CommonTrackListRow.tsx
- apps/web/src/components/Common/Podcast/CombinedChannels/List/CommonCombinedChannelNodes.tsx
- apps/web/src/components/Common/Podcast/CombinedChannels/List/types.ts
- apps/web/src/components/Common/Podcast/List/CommonPodcastListGridNode.tsx
- apps/web/src/components/Common/Podcast/List/CommonPodcastListNodes.tsx
- apps/web/src/components/Common/Podcast/List/CommonPodcastListRow.tsx
- apps/web/src/components/Common/Podcast/List/types.ts
- apps/web/src/components/Common/Podcast/List/Header/CommonDetailListHeader.tsx
- apps/web/src/components/Common/Podcast/List/Header/CommonListPageHeader.tsx
- apps/web/src/components/Common/Podcast/Media/CommonPodcastHeader.tsx
- apps/web/src/components/Common/Podcast/Media/CommonPodcastHeaderViewDesktop.tsx
- apps/web/src/components/Common/Podcast/Media/CommonPodcastHeaderViewTablet.tsx
- apps/web/src/components/Core/Episodes/List/CoreEpisodeGridNode.tsx
- apps/web/src/components/Core/Episodes/List/CoreEpisodeNodes.tsx
- apps/web/src/components/Core/Episodes/List/CoreEpisodeRow.tsx
- apps/web/src/components/Core/Episodes/List/CoreEpisodes.tsx
- apps/web/src/components/Core/Episodes/Media/CoreEpisodeHeader.tsx
- apps/web/src/components/Core/Livestream/List/CoreLivestreamGridNode.tsx
- apps/web/src/components/Core/Livestream/List/CoreLivestreamNodes.tsx
- apps/web/src/components/Core/Livestream/List/CoreLivestreamRow.tsx
- apps/web/src/components/Core/Livestream/List/CoreLivestreams.tsx
- apps/web/src/components/Core/Livestream/Media/CoreLivestreamHeader.tsx
- apps/web/src/components/Core/Music/Album/List/CoreAlbumGridNode.tsx
- apps/web/src/components/Core/Music/Album/List/CoreAlbumNodes.tsx
- apps/web/src/components/Core/Music/Album/List/CoreAlbumRow.tsx
- apps/web/src/components/Core/Music/Album/List/CoreAlbums.tsx
- apps/web/src/components/Core/Music/Album/Media/CoreAlbumHeader.tsx
- apps/web/src/components/Core/Music/Album/Media/CoreAlbumHeaderViewDesktop.tsx
- apps/web/src/components/Core/Music/Album/Media/CoreAlbumHeaderViewTablet.tsx
- apps/web/src/components/Core/Music/Artist/List/CoreArtistGridNode.tsx
- apps/web/src/components/Core/Music/Artist/List/CoreArtistNodes.tsx
- apps/web/src/components/Core/Music/Artist/List/CoreArtistRow.tsx
- apps/web/src/components/Core/Music/Artist/List/CoreArtists.tsx
- apps/web/src/components/Core/Music/Artist/Media/CoreArtistHeader.tsx
- apps/web/src/components/Core/Music/Artist/Media/CoreArtistHeaderViewDesktop.tsx
- apps/web/src/components/Core/Music/Artist/Media/CoreArtistHeaderViewTablet.tsx
- apps/web/src/components/Core/Music/Track/List/CoreTrackGridNode.tsx
- apps/web/src/components/Core/Music/Track/List/CoreTrackNodes.tsx
- apps/web/src/components/Core/Music/Track/List/CoreTrackRow.tsx
- apps/web/src/components/Core/Music/Track/List/CoreTracks.tsx
- apps/web/src/components/Core/Music/Track/Media/CoreTrackHeader.tsx
- apps/web/src/components/Core/Podcast/CombinedChannels/List/CoreCombinedChannelGridNode.tsx
- apps/web/src/components/Core/Podcast/CombinedChannels/List/CoreCombinedChannelNodes.tsx
- apps/web/src/components/Core/Podcast/CombinedChannels/List/CoreCombinedChannelRow.tsx
- apps/web/src/components/Core/Podcast/CombinedChannels/List/CoreCombinedChannels.tsx
- apps/web/src/components/Core/Podcast/List/CorePodcastGridNode.tsx
- apps/web/src/components/Core/Podcast/List/CorePodcastNodes.tsx
- apps/web/src/components/Core/Podcast/List/CorePodcastRow.tsx
- apps/web/src/components/Core/Podcast/List/CorePodcasts.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeader.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeaderButtons.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeaderCategories.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeaderImage.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeaderSubtitle.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeaderViewDesktop.tsx
- apps/web/src/components/Core/Podcast/Media/CorePodcastHeaderViewTablet.tsx
- apps/web/src/components/Media/Livestream/LivestreamHeader.tsx
- apps/web/src/components/Media/Music/Album/AlbumHeader.tsx
- apps/web/src/components/Media/Music/Album/Track/TrackHeader.tsx
- apps/web/src/components/Media/Music/Artist/ArtistHeader.tsx
- apps/web/src/components/Media/Podcast/Episode/EpisodeHeader.tsx

### Session 122 - 2026-02-03

#### Prompt (Developer)

implement the plans

#### Key Decisions

- Rebuilt add-by-RSS episodes list to use a local IndexedDB index with fast first-page render and background indexing.
- Switched add-by-RSS episode detail to a dedicated client using item GUID routing and add-by-RSS headers/play controls.
- Added medium filtering for add-by-RSS episodes using channel `medium_id` to include podcast/video feeds only.

#### Files Modified

- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailPageClient.tsx
- apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx
- apps/web/src/app/add-by-rss/episode/[id]/page.tsx
- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
- apps/web/src/app/add-by-rss/episodes/page.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeDetailHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeGridItem.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeNodes.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodeRow.tsx
- apps/web/src/components/AddByRSS/Podcast/Episode/AddByRSSEpisodesListNodes.tsx
- apps/web/src/utils/addByRSS/episodeIndex.ts
- apps/web/src/utils/addByRSS/storage.ts
- apps/web/src/utils/addByRSS/types.ts

### Session 123 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Always render pagination controls when totalPages > 1, even if the current page has no items yet.
- Clamp add-by-RSS episodes pages to the last valid page once the index count is available.

#### Files Modified

- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
- apps/web/src/utils/addByRSS/episodeIndex.ts

### Session 124 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Aligned add-by-RSS episodes page size with shared PAGINATION.DEFAULT_LIMIT.

#### Files Modified

- apps/web/src/utils/addByRSS/episodeIndex.ts

### Session 125 - 2026-02-03

#### Prompt (Developer)

make the add by rss pagination consistent with the non

#### Key Decisions

- Reused the existing `ListEpisodes` pagination spacing class for add-by-RSS.

#### Files Modified

- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx

### Session 126 - 2026-02-03

#### Prompt (Developer)

The Add by RSS episodes page and possibly the podcast page are automatically adding URL parameters but the URL parameters should be similar to the non-add by RSS podcasts and episodes where it can be set if the user types it in and then navigates to that URL parameter directly but otherwise The URL parameters should stay cleared and not visible in the URL bar. They only exist for navigating directly to a page with those filters and otherwise should not be visible.

#### Key Decisions

- Add-by-RSS episodes and podcast pages keep URL params only when the user navigates with them; defaults are removed.
- Add recent/oldest sorting to add-by-RSS podcast list and detail pages without auto-adding params.
- Drop URL syncing after initial navigation to keep URLs clean on user actions.

#### Files Modified

- apps/web/src/app/add-by-rss/episodes/AddByRSSEpisodesPageClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/components/AddByRSS/AddByRSSListClient.tsx
- apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader.tsx

### Session 127 - 2026-02-03

#### Prompt (Developer)

move the page client to components/AddByRSS since it is used in multiple pages

#### Key Decisions

- Moved AddByRSSDetailPageClient into components/AddByRSS and updated route imports.

#### Files Modified

- apps/web/src/components/AddByRSS/AddByRSSDetailPageClient.tsx
- apps/web/src/app/add-by-rss/[resource]/[id_text]/page.tsx
- apps/web/src/app/add-by-rss/album/[id]/page.tsx
- apps/web/src/app/add-by-rss/artist/[id]/page.tsx
- apps/web/src/app/add-by-rss/podcast/[id]/page.tsx
- apps/web/src/app/add-by-rss/track/[id]/page.tsx
- apps/web/src/app/add-by-rss/podcast/livestream/[id]/page.tsx
- apps/web/src/app/add-by-rss/music/livestream/[id]/page.tsx
- apps/web/src/app/add-by-rss/AddByRSSDetailClient.tsx

### Session 128 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added dedicated add-by-RSS artists list/detail clients with local pagination and recent/oldest sorting.
- Filtered add-by-RSS music lists to music-only mediums and matched artist-related album/track feeds by author/title.

#### Files Modified

- apps/web/src/app/add-by-rss/artists/AddByRSSArtistsPageClient.tsx
- apps/web/src/app/add-by-rss/artists/page.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageListHeader.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageList.tsx
- apps/web/src/app/add-by-rss/artist/AddByRSSArtistPageClient.tsx
- apps/web/src/app/add-by-rss/artist/[id]/page.tsx

### Session 129 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Moved add-by-RSS feed creation to a dedicated /add-by-rss/add page with status updates and redirect on parse success.
- Auto-detect add-by-RSS resource type from mapped medium_id (including publisher music detection) and update stored records before redirect.
- Added a sidebar Add by RSS button and removed add-feed forms from list views.

#### Files Modified

- apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx
- apps/web/src/utils/addByRSS/resourceType.ts
- apps/web/src/app/add-by-rss/add/page.tsx
- apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx
- apps/web/src/styles/components/AddByRSS/AddByRSSAddFeed.module.scss
- apps/web/src/constants/routes.ts
- apps/web/src/components/SideBar/SideBar.tsx
- apps/web/src/styles/components/SideBar/SideBar.module.scss
- apps/web/i18n/originals/en-US.json

### Session 130 - 2026-02-03

#### Prompt (Developer)

the add by rss in the sidebar should not be a button, but the same type of link element as the other sidebar items

#### Key Decisions

- Switched the add-by-RSS sidebar entry back to the standard SideBarLink.

#### Files Modified

- apps/web/src/components/SideBar/SideBar.tsx
- apps/web/src/styles/components/SideBar/SideBar.module.scss

### Session 131 - 2026-02-03

#### Prompt (Developer)

the "Check for Updates" button on the add by rss pages within the header should be the same style as the dropdown looking buttons in the header

#### Key Decisions

- Matched the add-by-RSS check updates button styling to dropdown buttons by switching to the mini variant.

#### Files Modified

- apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx

### Session 132 - 2026-02-03

#### Prompt (Developer)

the "Add Feed" button should become disabled and show a loading spinner in it while working

#### Key Decisions

- Added disabled/loading support to TextInput buttons and wired it for add-by-RSS add feed.

#### Files Modified

- apps/web/src/components/Form/TextInput.tsx
- apps/web/src/app/add-by-rss/add/AddByRSSAddFeedPageClient.tsx

### Session 133 - 2026-02-03

#### Prompt (Developer)

the Check Feed for Updates button shows a loading spinner inside it already, so it does not need to show the global loading spinner as well

#### Key Decisions

- Suppressed the global list loading spinner while check updates is in progress.

#### Files Modified

- apps/web/src/components/AddByRSS/List/AddByRSSListClient.tsx

### Session 134 - 2026-02-03

#### Prompt (Developer)

the "Check Feed for Updates" loadingspinneroverlay handling i describe needs to be applied to all pages that use Check Feed for Updates not just the add by rss pages

#### Key Decisions

- Removed the global loading overlay from add-by-RSS podcast settings while check updates runs.

#### Files Modified

- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx

### Session 135 - 2026-02-03

#### Prompt (Developer)

update

#### Key Decisions

- Used formatDateTimeAbbrev for last parsed timestamps to display localized time.

#### Files Modified

- apps/web/src/components/List/ListChannelSettings.tsx
