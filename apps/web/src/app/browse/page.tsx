import type { MediaListChipsConfig } from '../../components/MediaListChips/MediaListChips';
import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
import { mediaListPageDefaultChip } from '../../lib/listScreenDefaults';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import {
  BROWSE_CHIPS,
  MEDIA_LIST_CHIP_QUERY_PARAM,
  mediaListChipsForCatalog,
  readStoredMediaListChip,
  resolveMediaListChip,
} from '../../utils/mediaListChips';
import { loadAlbumsListProps } from '../_media-lists/albums/albumsListSsr';
import { AlbumsPageClient } from '../_media-lists/albums/AlbumsPageClient';
import { loadArtistsListProps } from '../_media-lists/artists/artistsListSsr';
import { ArtistsPageClient } from '../_media-lists/artists/ArtistsPageClient';
import { loadClipsListProps } from '../_media-lists/clips/clipsListSsr';
import { ClipsPageClient } from '../_media-lists/clips/ClipsPageClient';
import { loadEpisodesListProps } from '../_media-lists/episodes/episodesListSsr';
import { EpisodesPageClient } from '../_media-lists/episodes/EpisodesPageClient';
import { loadLivestreamsListProps } from '../_media-lists/livestreams/livestreamsListSsr';
import { LivestreamsPageClient } from '../_media-lists/livestreams/LivestreamsPageClient';
import type { MediaListSearchParams } from '../_media-lists/mediaListSsr';
import { getMediaListSsr } from '../_media-lists/mediaListSsr';
import { loadPodcastsListProps } from '../_media-lists/podcasts/podcastsListSsr';
import { PodcastsPageClient } from '../_media-lists/podcasts/PodcastsPageClient';
import { loadTracksListProps } from '../_media-lists/tracks/tracksListSsr';
import { TracksPageClient } from '../_media-lists/tracks/TracksPageClient';
import { loadPlaylistsBrowseProps } from '../playlists/playlistsListSsr';
import { PlaylistsPageClient } from '../playlists/PlaylistsPageClient';
import { loadProfilesBrowseProps } from '../profiles/profilesListSsr';
import { ProfilesPageClient } from '../profiles/ProfilesPageClient';
import { PeopleBrowseClient } from './PeopleBrowseClient';

type BrowsePageProps = { searchParams: Promise<MediaListSearchParams> };

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('browse');
}

export default async function BrowsePage({ searchParams }: BrowsePageProps) {
  const params = await searchParams;
  const ssr = await getMediaListSsr();
  const chips = mediaListChipsForCatalog(BROWSE_CHIPS, getCatalogConfig().musicEnabled);
  const { chip, urlChip } = resolveMediaListChip({
    chips,
    urlValue: params[MEDIA_LIST_CHIP_QUERY_PARAM],
    storedValue: readStoredMediaListChip(ssr.localSettings, 'browse'),
    defaultChip: mediaListPageDefaultChip('browse', chips),
  });
  const chipsConfig: MediaListChipsConfig = {
    page: 'browse',
    chips,
    selected: chip,
    urlChip,
  };

  switch (chip) {
    case 'podcasts':
      return (
        <PodcastsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadPodcastsListProps('browse', params, ssr)}
        />
      );
    case 'episodes':
      return (
        <EpisodesPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadEpisodesListProps('browse', params, ssr)}
        />
      );
    case 'clips':
      return (
        <ClipsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadClipsListProps('browse', params, ssr)}
        />
      );
    case 'artists':
      return (
        <ArtistsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadArtistsListProps('browse', params, ssr)}
        />
      );
    case 'albums':
      return (
        <AlbumsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadAlbumsListProps('browse', params, ssr)}
        />
      );
    case 'tracks':
      return (
        <TracksPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadTracksListProps('browse', params, ssr)}
        />
      );
    case 'livestreams':
      return (
        <LivestreamsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadLivestreamsListProps('browse', params, ssr)}
        />
      );
    case 'playlists':
      return (
        <PlaylistsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadPlaylistsBrowseProps(params, ssr)}
        />
      );
    case 'users':
      return (
        <ProfilesPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadProfilesBrowseProps(params, ssr)}
        />
      );
    case 'people':
      return <PeopleBrowseClient key={chip} chipsConfig={chipsConfig} />;
    default: {
      const _exhaustive: never = chip;
      return _exhaustive;
    }
  }
}
