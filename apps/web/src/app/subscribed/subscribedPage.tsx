import type { MediaListChipsConfig } from '../../components/MediaListChips/MediaListChips';
import { getCatalogConfig } from '../../lib/catalog/catalogPolicy';
import { mediaListPageDefaultChip } from '../../lib/listScreenDefaults';
import { getCuratedStaticPageMetadata } from '../../lib/seo/curatedPageMetadata';
import {
  MEDIA_LIST_CHIP_QUERY_PARAM,
  mediaListChipsForCatalog,
  readStoredMediaListChip,
  resolveMediaListChip,
  SUBSCRIBED_CHIPS,
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

type SubscribedPageProps = { searchParams: Promise<MediaListSearchParams> };

export async function generateMetadata() {
  return getCuratedStaticPageMetadata('home');
}

export default async function SubscribedPage({ searchParams }: SubscribedPageProps) {
  const params = await searchParams;
  const ssr = await getMediaListSsr();
  const chips = mediaListChipsForCatalog(SUBSCRIBED_CHIPS, getCatalogConfig().musicEnabled);
  const { chip, urlChip } = resolveMediaListChip({
    chips,
    urlValue: params[MEDIA_LIST_CHIP_QUERY_PARAM],
    storedValue: readStoredMediaListChip(ssr.localSettings, 'subscribed'),
    defaultChip: mediaListPageDefaultChip('subscribed', chips),
  });
  const chipsConfig: MediaListChipsConfig = {
    page: 'subscribed',
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
          {...await loadPodcastsListProps('subscribed', params, ssr)}
        />
      );
    case 'episodes':
      return (
        <EpisodesPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadEpisodesListProps('subscribed', params, ssr)}
        />
      );
    case 'clips':
      return (
        <ClipsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadClipsListProps('subscribed', params, ssr)}
        />
      );
    case 'artists':
      return (
        <ArtistsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadArtistsListProps('subscribed', params, ssr)}
        />
      );
    case 'albums':
      return (
        <AlbumsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadAlbumsListProps('subscribed', params, ssr)}
        />
      );
    case 'tracks':
      return (
        <TracksPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadTracksListProps('subscribed', params, ssr)}
        />
      );
    case 'livestreams':
      return (
        <LivestreamsPageClient
          key={chip}
          chipsConfig={chipsConfig}
          {...await loadLivestreamsListProps('subscribed', params, ssr)}
        />
      );
    default: {
      const _exhaustive: never = chip;
      return _exhaustive;
    }
  }
}
