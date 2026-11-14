import type { DTOChannelDirectoryMatch } from '@podverse/helpers/dto';
import { getChannelRouteKind } from '@podverse/helpers/medium';

import { buildAlbumDetailParams } from '../../navigation/albumDetailParams';
import { buildArtistDetailParams } from '../../navigation/artistDetailParams';
import { buildPodcastDetailParams } from '../../navigation/podcastDetailParams';

/**
 * Replaces the current screen with the directory detail for this channel.
 *
 * Add by RSS screens sit on stacks that also register the podcast, album, and artist details.
 * The screen's own param list does not name those routes, so the replace is applied through
 * the stack's route names.
 */
type DirectoryDetailReplace = {
  replace: (name: 'AlbumDetail' | 'ArtistDetail' | 'PodcastDetail', params: object) => void;
};

const asDirectoryDetailReplace = (navigation: object): DirectoryDetailReplace => {
  return navigation as DirectoryDetailReplace;
};

export const replaceWithDirectoryChannel = (
  navigation: object,
  channel: DTOChannelDirectoryMatch
): void => {
  const stack = asDirectoryDetailReplace(navigation);
  const routeKind = getChannelRouteKind(channel.medium_id);
  const previewTitle = channel.title;
  if (routeKind === 'artist') {
    stack.replace(
      'ArtistDetail',
      buildArtistDetailParams({
        artistId: channel.id_text,
        previewImageUrl: null,
        previewTitle,
      })
    );
    return;
  }
  if (routeKind === 'album') {
    stack.replace(
      'AlbumDetail',
      buildAlbumDetailParams({
        albumId: channel.id_text,
        previewImageUrl: null,
        previewTitle,
      })
    );
    return;
  }
  stack.replace(
    'PodcastDetail',
    buildPodcastDetailParams({
      podcastId: channel.id_text,
      previewImageUrl: null,
      previewTitle,
    })
  );
};
