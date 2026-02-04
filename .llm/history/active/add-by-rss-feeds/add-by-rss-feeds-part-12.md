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
