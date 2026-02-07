### Session 1 - 2026-02-05

#### Prompt (Developer)

Implement the plan as specified, it is attached for your reference. Do NOT edit the plan file itself.

To-do's from the plan have already been created. Do not create them again. Mark them as in_progress as you work, starting with the first one. Don't stop until you have completed all the to-dos.

#### Key Decisions

- Move Media/Music header and play-section logic into Core equivalents for artist/album/track.
- Move Media/Podcast episode play section and summary into Core equivalents.
- Replace page-level Media/Music and Media/Podcast header usage with Core components.
- Remove Media/Music and Media/Podcast files once references were eliminated.

#### Files Modified

- apps/web/src/app/add-by-rss/episode/AddByRSSEpisodePageClient.tsx
- apps/web/src/app/add-by-rss/track/AddByRSSTrackItemPageClient.tsx
- apps/web/src/app/album/[channel_id]/AlbumPageClient.tsx
- apps/web/src/app/artist/[channel_id]/ArtistPageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageClient.tsx
- apps/web/src/app/episode/[item_id]/EpisodePageList.tsx
- apps/web/src/app/podcast/livestream/[item_id]/LivestreamPageList.tsx
- apps/web/src/app/track/[item_id]/TrackPageClient.tsx
- apps/web/src/app/track/[item_id]/TrackPageList.tsx
- apps/web/src/components/Core/Artist/Album/CoreAlbumHeaderButtons.tsx
- apps/web/src/components/Core/Artist/Album/CoreAlbumHeaderImage.tsx
- apps/web/src/components/Core/Artist/Album/CoreAlbumHeaderSubtitle.tsx
- apps/web/src/components/Core/Artist/Album/CoreAlbumHeaderViewDesktop.tsx
- apps/web/src/components/Core/Artist/Album/CoreAlbumHeaderViewTablet.tsx
- apps/web/src/components/Core/Artist/Album/Track/CoreTrackHeader.tsx
- apps/web/src/components/Core/Artist/Album/Track/CoreTrackHeaderPlaySection.tsx
- apps/web/src/components/Core/Artist/CoreArtistHeaderButtons.tsx
- apps/web/src/components/Core/Artist/CoreArtistHeaderImage.tsx
- apps/web/src/components/Core/Artist/CoreArtistHeaderSubtitle.tsx
- apps/web/src/components/Core/Artist/CoreArtistHeaderViewDesktop.tsx
- apps/web/src/components/Core/Artist/CoreArtistHeaderViewTablet.tsx
- apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeader.tsx
- apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeHeaderPlaySection.tsx
- apps/web/src/components/Core/Podcast/Episodes/CoreEpisodeSummary.tsx
- apps/web/src/components/Media/Music/Album/AlbumHeader.tsx (deleted)
- apps/web/src/components/Media/Music/Album/AlbumHeaderButtons.tsx (deleted)
- apps/web/src/components/Media/Music/Album/AlbumHeaderImage.tsx (deleted)
- apps/web/src/components/Media/Music/Album/AlbumHeaderSubtitle.tsx (deleted)
- apps/web/src/components/Media/Music/Album/AlbumHeaderViewDesktop.tsx (deleted)
- apps/web/src/components/Media/Music/Album/AlbumHeaderViewTablet.tsx (deleted)
- apps/web/src/components/Media/Music/Album/Track/TrackHeader.tsx (deleted)
- apps/web/src/components/Media/Music/Album/Track/TrackHeaderPlaySection.tsx (deleted)
- apps/web/src/components/Media/Music/Album/Track/TrackSummary.tsx (deleted)
- apps/web/src/components/Media/Music/Artist/ArtistHeader.tsx (deleted)
- apps/web/src/components/Media/Music/Artist/ArtistHeaderButtons.tsx (deleted)
- apps/web/src/components/Media/Music/Artist/ArtistHeaderImage.tsx (deleted)
- apps/web/src/components/Media/Music/Artist/ArtistHeaderSubtitle.tsx (deleted)
- apps/web/src/components/Media/Music/Artist/ArtistHeaderViewDesktop.tsx (deleted)
- apps/web/src/components/Media/Music/Artist/ArtistHeaderViewTablet.tsx (deleted)
- apps/web/src/components/Media/Podcast/Episode/EpisodeHeader.tsx (deleted)
- apps/web/src/components/Media/Podcast/Episode/EpisodeHeaderPlaySection.tsx (deleted)
- apps/web/src/components/Media/Podcast/Episode/EpisodeSummary.tsx (deleted)
