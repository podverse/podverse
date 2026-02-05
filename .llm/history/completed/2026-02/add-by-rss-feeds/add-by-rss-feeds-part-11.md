# Feature: add-by-rss-feeds (Part 11)

> **Note**: This LLM history file is optional. If you're not using LLM assistance for
> development, you can delete this file and the containing directory. The history tracking
> system helps document LLM-assisted decisions but is not required for contributing.
>
> **10-Session Limit**: Each part file is limited to 10 sessions. When adding Session 121,
> create `add-by-rss-feeds-part-12.md`.

## Metadata

- Started: 2026-02-03
- Completed: 2026-02-05
- Author: Mitch Downey
- LLM(s): Cursor, Claude, etc.
- GitHub Issues: https://github.com/podverse/podverse/issues/43
- Branch: feature/add-by-rss-feeds
- Origin: git@github.com:podverse/podverse.git
- Is Fork: no

## Context

Refresh add-by-RSS subscribe state using auth/me.

## Sessions

### Session 111 - 2026-02-03

#### Prompt (Developer)

save those plan files locally so i can run them in parallel if they able to be run in parallel

#### Key Decisions

- Copy resource-specific plans into `.llm/plans/active/add-by-rss/` for parallel execution.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- .llm/plans/active/page-renames-podcasts.md
- .llm/plans/active/page-renames-episodes.md
- .llm/plans/active/page-renames-artists.md
- .llm/plans/active/page-renames-albums.md
- .llm/plans/active/page-renames-tracks.md
- .llm/plans/active/page-renames-livestreams.md
- .llm/plans/active/page-renames-add-by-rss.md
- .llm/plans/active/page-renames-non-media.md
- .llm/plans/active/add-by-rss/episodes-list-pattern.md
- .llm/plans/active/add-by-rss/episodes-header-pattern.md
- .llm/plans/active/add-by-rss/artists-list-pattern.md
- .llm/plans/active/add-by-rss/artists-header-pattern.md
- .llm/plans/active/add-by-rss/albums-list-pattern.md
- .llm/plans/active/add-by-rss/albums-header-pattern.md
- .llm/plans/active/add-by-rss/tracks-list-pattern.md
- .llm/plans/active/add-by-rss/tracks-header-pattern.md
- .llm/plans/active/add-by-rss/livestreams-list-pattern.md
- .llm/plans/active/add-by-rss/livestreams-header-pattern.md
- .llm/plans/active/add-by-rss/home-subscriptions-ux-pattern.md

### Session 112 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Split Page component rename work into per-resource plan files for parallel execution.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md

### Session 113 - 2026-02-03

#### Prompt (Developer)

implement the \*-list-pattern.md plans one after another until all are completed, and when you complete a plan, move that plan to completed

#### Key Decisions

- Apply list pattern plans sequentially and move each plan file to completed after finishing.
- Consolidate list UI into new Common/Core components while relocating AddByRSS list nodes into
  components.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- .llm/plans/completed/add-by-rss/albums-list-pattern.md
- .llm/plans/completed/add-by-rss/artists-list-pattern.md
- .llm/plans/completed/add-by-rss/episodes-list-pattern.md
- .llm/plans/completed/add-by-rss/livestreams-list-pattern.md
- .llm/plans/completed/add-by-rss/tracks-list-pattern.md
- apps/web/src/app/albums/AlbumsList.tsx
- apps/web/src/app/artists/ArtistsList.tsx
- apps/web/src/app/episodes/EpisodesList.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsList.tsx
- apps/web/src/app/tracks/TracksList.tsx
- apps/web/src/components/AddByRSS/AddByRSSListClient.tsx
- apps/web/src/components/AddByRSS/Episodes/AddByRSSEpisodeGridNode.tsx
- apps/web/src/components/AddByRSS/Episodes/AddByRSSEpisodeNodes.tsx
- apps/web/src/components/AddByRSS/Episodes/AddByRSSEpisodeRow.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamGridNode.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamNodes.tsx
- apps/web/src/components/AddByRSS/Livestream/AddByRSSLivestreamRow.tsx
- apps/web/src/components/AddByRSS/Music/Album/AddByRSSAlbumGridNode.tsx
- apps/web/src/components/AddByRSS/Music/Album/AddByRSSAlbumNodes.tsx
- apps/web/src/components/AddByRSS/Music/Album/AddByRSSAlbumRow.tsx
- apps/web/src/components/AddByRSS/Music/Artist/AddByRSSArtistGridNode.tsx
- apps/web/src/components/AddByRSS/Music/Artist/AddByRSSArtistNodes.tsx
- apps/web/src/components/AddByRSS/Music/Artist/AddByRSSArtistRow.tsx
- apps/web/src/components/AddByRSS/Music/Track/AddByRSSTrackGridNode.tsx
- apps/web/src/components/AddByRSS/Music/Track/AddByRSSTrackNodes.tsx
- apps/web/src/components/AddByRSS/Music/Track/AddByRSSTrackRow.tsx
- apps/web/src/components/Common/List/Album/CommonAlbumListGridNode.tsx
- apps/web/src/components/Common/List/Album/CommonAlbumListNodes.tsx
- apps/web/src/components/Common/List/Album/CommonAlbumListRow.tsx
- apps/web/src/components/Common/List/Album/types.ts
- apps/web/src/components/Common/List/Artist/CommonArtistListGridNode.tsx
- apps/web/src/components/Common/List/Artist/CommonArtistListNodes.tsx
- apps/web/src/components/Common/List/Artist/CommonArtistListRow.tsx
- apps/web/src/components/Common/List/Artist/types.ts
- apps/web/src/components/Common/List/Episode/CommonEpisodeListGridNode.tsx
- apps/web/src/components/Common/List/Episode/CommonEpisodeListNodes.tsx
- apps/web/src/components/Common/List/Episode/CommonEpisodeListRow.tsx
- apps/web/src/components/Common/List/Episode/types.ts
- apps/web/src/components/Common/List/Livestream/CommonLivestreamListGridNode.tsx
- apps/web/src/components/Common/List/Livestream/CommonLivestreamListNodes.tsx
- apps/web/src/components/Common/List/Livestream/CommonLivestreamListRow.tsx
- apps/web/src/components/Common/List/Track/CommonTrackListGridNode.tsx
- apps/web/src/components/Common/List/Track/CommonTrackListNodes.tsx
- apps/web/src/components/Common/List/Track/CommonTrackListRow.tsx
- apps/web/src/components/Core/List/Album/CoreAlbumGridNode.tsx
- apps/web/src/components/Core/List/Album/CoreAlbumNodes.tsx
- apps/web/src/components/Core/List/Album/CoreAlbumRow.tsx
- apps/web/src/components/Core/List/Album/CoreAlbums.tsx
- apps/web/src/components/Core/List/Artist/CoreArtistGridNode.tsx
- apps/web/src/components/Core/List/Artist/CoreArtistNodes.tsx
- apps/web/src/components/Core/List/Artist/CoreArtistRow.tsx
- apps/web/src/components/Core/List/Artist/CoreArtists.tsx
- apps/web/src/components/Core/List/Episode/CoreEpisodeGridNode.tsx
- apps/web/src/components/Core/List/Episode/CoreEpisodeNodes.tsx
- apps/web/src/components/Core/List/Episode/CoreEpisodeRow.tsx
- apps/web/src/components/Core/List/Episode/CoreEpisodes.tsx
- apps/web/src/components/Core/List/Livestream/CoreLivestreamGridNode.tsx
- apps/web/src/components/Core/List/Livestream/CoreLivestreamNodes.tsx
- apps/web/src/components/Core/List/Livestream/CoreLivestreamRow.tsx
- apps/web/src/components/Core/List/Livestream/CoreLivestreams.tsx
- apps/web/src/components/Core/List/Track/CoreTrackGridNode.tsx
- apps/web/src/components/Core/List/Track/CoreTrackNodes.tsx
- apps/web/src/components/Core/List/Track/CoreTrackRow.tsx
- apps/web/src/components/Core/List/Track/CoreTracks.tsx

### Session 114 - 2026-02-03

#### Prompt (Developer)

complete the page-renames-\* one after another and move the plan to complete after each is finished

#### Key Decisions

- Renamed playlist create/edit and auth/system page clients to Page naming and updated route imports.
- Moved the non-media page-renames plan to completed after finishing all remaining items.
- Renamed podcast and track page context/dropdown config modules to Page naming and updated imports.
- Moved the podcasts and tracks page-renames plans to completed.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- .llm/plans/active/page-renames-non-media.md
- .llm/plans/completed/page-renames-non-media.md
- .llm/plans/active/page-renames-podcasts.md
- .llm/plans/completed/page-renames-podcasts.md
- .llm/plans/active/page-renames-tracks.md
- .llm/plans/completed/page-renames-tracks.md
- apps/web/src/app/podcast/[channel_id]/PodcastContext.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastDropdownConfig.ts
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageContext.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageDropdownConfig.ts
- apps/web/src/app/podcast/[channel_id]/PodcastPageList.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx
- apps/web/src/app/podcast/[channel_id]/page.tsx
- apps/web/src/app/podcasts/PodcastsContext.tsx
- apps/web/src/app/podcasts/PodcastsDropdownConfig.ts
- apps/web/src/app/podcasts/PodcastsPageClient.tsx
- apps/web/src/app/podcasts/PodcastsPageContext.tsx
- apps/web/src/app/podcasts/PodcastsPageDropdownConfig.ts
- apps/web/src/app/podcasts/PodcastsPageHeader.tsx
- apps/web/src/app/podcasts/PodcastsPageList.tsx
- apps/web/src/app/podcasts/page.tsx
- apps/web/src/app/track/[item_id]/TrackClient.tsx
- apps/web/src/app/track/[item_id]/TrackContext.tsx
- apps/web/src/app/track/[item_id]/TrackDropdownConfig.tsx
- apps/web/src/app/track/[item_id]/TrackList.tsx
- apps/web/src/app/track/[item_id]/TrackListHeader.tsx
- apps/web/src/app/track/[item_id]/TrackPageClient.tsx
- apps/web/src/app/track/[item_id]/TrackPageContext.tsx
- apps/web/src/app/track/[item_id]/TrackPageDropdownConfig.tsx
- apps/web/src/app/track/[item_id]/TrackPageList.tsx
- apps/web/src/app/track/[item_id]/TrackPageListHeader.tsx
- apps/web/src/app/track/[item_id]/page.tsx
- apps/web/src/app/tracks/TracksClient.tsx
- apps/web/src/app/tracks/TracksContext.tsx
- apps/web/src/app/tracks/TracksDropdownConfig.tsx
- apps/web/src/app/tracks/TracksHeader.tsx
- apps/web/src/app/tracks/TracksList.tsx
- apps/web/src/app/tracks/TracksPageClient.tsx
- apps/web/src/app/tracks/TracksPageContext.tsx
- apps/web/src/app/tracks/TracksPageDropdownConfig.tsx
- apps/web/src/app/tracks/TracksPageHeader.tsx
- apps/web/src/app/tracks/TracksPageList.tsx
- apps/web/src/app/tracks/page.tsx
- apps/web/src/app/checkout/CheckoutClient.tsx
- apps/web/src/app/checkout/CheckoutPageClient.tsx
- apps/web/src/app/checkout/page.tsx
- apps/web/src/app/email-change/EmailChangeClient.tsx
- apps/web/src/app/email-change/EmailChangePageClient.tsx
- apps/web/src/app/email-change/page.tsx
- apps/web/src/app/email-change-verifying/EmailChangeVerifyingClient.tsx
- apps/web/src/app/email-change-verifying/EmailChangeVerifyingPageClient.tsx
- apps/web/src/app/email-change-verifying/page.tsx
- apps/web/src/app/forgot-password/ForgotPasswordClient.tsx
- apps/web/src/app/forgot-password/ForgotPasswordPageClient.tsx
- apps/web/src/app/forgot-password/page.tsx
- apps/web/src/app/playlist/create/PlaylistCreateClient.tsx
- apps/web/src/app/playlist/create/PlaylistCreateContext.tsx
- apps/web/src/app/playlist/create/PlaylistCreateForm.tsx
- apps/web/src/app/playlist/create/PlaylistCreateHeader.tsx
- apps/web/src/app/playlist/create/PlaylistCreatePageClient.tsx
- apps/web/src/app/playlist/create/PlaylistCreatePageContext.tsx
- apps/web/src/app/playlist/create/PlaylistCreatePageForm.tsx
- apps/web/src/app/playlist/create/PlaylistCreatePageHeader.tsx
- apps/web/src/app/playlist/create/page.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditButtonTabs.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditClient.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditContext.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditForm.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditHeader.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditList.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageButtonTabs.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageClient.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageContext.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageForm.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageHeader.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/PlaylistEditPageList.tsx
- apps/web/src/app/playlist/edit/[playlist_id]/page.tsx
- apps/web/src/app/reset-password/ResetPasswordClient.tsx
- apps/web/src/app/reset-password/ResetPasswordPageClient.tsx
- apps/web/src/app/reset-password/page.tsx
- apps/web/src/app/test-error-boundaries/TestErrorBoundariesClient.tsx
- apps/web/src/app/test-error-boundaries/TestErrorBoundariesPageClient.tsx
- apps/web/src/app/test-error-boundaries/page.tsx
- apps/web/src/app/updates/UpdatesClient.tsx
- apps/web/src/app/updates/UpdatesPageClient.tsx
- apps/web/src/app/updates/page.tsx
- apps/web/src/app/verify-email/VerifyEmailClient.tsx
- apps/web/src/app/verify-email/VerifyEmailPageClient.tsx
- apps/web/src/app/verify-email/page.tsx

### Session 115 - 2026-02-03

#### Prompt (Developer)

review the work you've done for the add-by-rss plans and determine if there are any skills or rules that should be updated to make sure you remember these patterns going forward

#### Key Decisions

- Documented list pattern refactors and Page renames in the add-by-RSS components sync skill.
- Added parity guidance about reusing shared wrappers like `DetailListWrapper`.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- .cursor/skills/add-by-rss-components-sync/SKILL.md
- .cursor/skills/add-by-rss-parity-sync/SKILL.md

### Session 116 - 2026-02-03

#### Prompt (Developer)

update the skills

#### Key Decisions

- Add concise examples to the add-by-RSS skills to reinforce the refactor patterns.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- .cursor/skills/add-by-rss-components-sync/SKILL.md
- .cursor/skills/add-by-rss-parity-sync/SKILL.md

### Session 117 - 2026-02-03

#### Prompt (Developer)

implement the home-subscriptions-ux-pattern then move to completed when completed

#### Key Decisions

- Replaced ListCombinedChannels with new Common/Core combined channels list components.
- Updated home subscriptions list to use Core combined channels.
- Moved the home-subscriptions-ux-pattern plan to completed.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- .llm/plans/active/add-by-rss/home-subscriptions-ux-pattern.md
- .llm/plans/completed/add-by-rss/home-subscriptions-ux-pattern.md
- apps/web/src/app/HomePageList.tsx
- apps/web/src/components/Common/List/CombinedChannels/CommonCombinedChannelNodes.tsx
- apps/web/src/components/Common/List/CombinedChannels/types.ts
- apps/web/src/components/Core/List/CombinedChannels/CoreCombinedChannelGridNode.tsx
- apps/web/src/components/Core/List/CombinedChannels/CoreCombinedChannelNodes.tsx
- apps/web/src/components/Core/List/CombinedChannels/CoreCombinedChannelRow.tsx
- apps/web/src/components/Core/List/CombinedChannels/CoreCombinedChannels.tsx
- apps/web/src/components/List/ListCombinedChannels/ListCombinedChannelGridNode.tsx
- apps/web/src/components/List/ListCombinedChannels/ListCombinedChannelNodes.tsx
- apps/web/src/components/List/ListCombinedChannels/ListCombinedChannelRow.tsx
- apps/web/src/components/List/ListCombinedChannels/ListCombinedChannels.tsx

### Session 118 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Updated add-by-RSS podcast detail route to use AddByRSSDetailPageClient.
- Scanned for other stale imports referencing deleted files.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- apps/web/src/app/add-by-rss/podcast/[id]/page.tsx

### Session 119 - 2026-02-03

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Added Common list header primitives to standardize list and detail list headers.
- Moved list page header logic into Core components and rewired page clients.
- Moved detail list header logic into Core components and rewired detail page clients.
- Added AddByRSS header adapters for list pages and podcast detail tabs.
- Removed obsolete page-level header components.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- apps/web/src/app/HomePageClient.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageClient.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx
- apps/web/src/app/episodes/EpisodesPageClient.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageClient.tsx
- apps/web/src/app/podcasts/PodcastsPageClient.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsPageClient.tsx
- apps/web/src/app/tracks/TracksPageClient.tsx
- apps/web/src/app/track/[item_id]/TrackPageClient.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageDetailClient.tsx
- apps/web/src/app/HomePageHeader.tsx
- apps/web/src/app/podcasts/PodcastsPageHeader.tsx
- apps/web/src/app/episodes/EpisodesPageHeader.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx
- apps/web/src/app/albums/AlbumsPageHeader.tsx
- apps/web/src/app/artists/ArtistsPageHeader.tsx
- apps/web/src/app/tracks/TracksPageHeader.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageListHeader.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx
- apps/web/src/app/track/[item_id]/TrackPageListHeader.tsx
- apps/web/src/app/add-by-rss/podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/components/AddByRSS/AddByRSSListClient.tsx
- apps/web/src/components/AddByRSS/List/AddByRSSListHeader.tsx
- apps/web/src/components/AddByRSS/Podcast/AddByRSSPodcastPageListHeader.tsx
- apps/web/src/components/Common/List/Header/CommonDetailListHeader.tsx
- apps/web/src/components/Common/List/Header/CommonListPageHeader.tsx
- apps/web/src/components/Core/List/Album/CoreAlbumsPageHeader.tsx
- apps/web/src/components/Core/List/Artist/CoreArtistsPageHeader.tsx
- apps/web/src/components/Core/List/CombinedChannels/CoreHomePageHeader.tsx
- apps/web/src/components/Core/List/Episode/CoreEpisodesPageHeader.tsx
- apps/web/src/components/Core/List/Livestream/CoreLivestreamsPageHeader.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastsPageHeader.tsx
- apps/web/src/components/Core/List/Track/CoreTracksPageHeader.tsx
- apps/web/src/components/Core/Media/Episode/CoreEpisodePageListHeader.tsx
- apps/web/src/components/Core/Media/Livestream/CoreLivestreamPageListHeader.tsx
- apps/web/src/components/Core/Media/Music/Album/CoreAlbumPageListHeader.tsx
- apps/web/src/components/Core/Media/Music/Artist/CoreArtistPageListHeader.tsx
- apps/web/src/components/Core/Media/Music/Track/CoreTrackPageListHeader.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastPageListHeader.tsx

### Session 120 - 2026-02-03

#### Prompt (Developer)

the components that have "Page" in them should be in the src/app/ directories alongside the page where they are used, unless that page component is used on more than one page

#### Key Decisions

- Moved Page-named headers back into their page directories and reused Common header primitives.
- Removed Core page header wrappers that were only used by a single page.

#### Files Modified

- .llm/history/active/add-by-rss-feeds/add-by-rss-feeds-part-11.md
- apps/web/src/app/HomePageClient.tsx
- apps/web/src/app/HomePageHeader.tsx
- apps/web/src/app/podcasts/PodcastsPageClient.tsx
- apps/web/src/app/podcasts/PodcastsPageHeader.tsx
- apps/web/src/app/episodes/EpisodesPageClient.tsx
- apps/web/src/app/episodes/EpisodesPageHeader.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsPageClient.tsx
- apps/web/src/app/podcasts/livestreams/LivestreamsPageHeader.tsx
- apps/web/src/app/albums/AlbumsPageClient.tsx
- apps/web/src/app/albums/AlbumsPageHeader.tsx
- apps/web/src/app/artists/ArtistsPageClient.tsx
- apps/web/src/app/artists/ArtistsPageHeader.tsx
- apps/web/src/app/tracks/TracksPageClient.tsx
- apps/web/src/app/tracks/TracksPageHeader.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageClient.tsx
- apps/web/src/app/podcast/[channel_id]/PodcastPageListHeader.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageListHeader.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageClient.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageListHeader.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageClient.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageListHeader.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageListHeader.tsx
- apps/web/src/app/track/[item_id]/TrackPageClient.tsx
- apps/web/src/app/track/[item_id]/TrackPageListHeader.tsx
- apps/web/src/components/Core/List/Podcast/CorePodcastsPageHeader.tsx
- apps/web/src/components/Core/List/Episode/CoreEpisodesPageHeader.tsx
- apps/web/src/components/Core/List/Album/CoreAlbumsPageHeader.tsx
- apps/web/src/components/Core/List/Artist/CoreArtistsPageHeader.tsx
- apps/web/src/components/Core/List/Track/CoreTracksPageHeader.tsx
- apps/web/src/components/Core/List/Livestream/CoreLivestreamsPageHeader.tsx
- apps/web/src/components/Core/List/CombinedChannels/CoreHomePageHeader.tsx
- apps/web/src/components/Core/Media/Podcast/CorePodcastPageListHeader.tsx
- apps/web/src/components/Core/Media/Episode/CoreEpisodePageListHeader.tsx
- apps/web/src/components/Core/Media/Livestream/CoreLivestreamPageListHeader.tsx
- apps/web/src/components/Core/Media/Music/Album/CoreAlbumPageListHeader.tsx
- apps/web/src/components/Core/Media/Music/Artist/CoreArtistPageListHeader.tsx
- apps/web/src/components/Core/Media/Music/Track/CoreTrackPageListHeader.tsx
