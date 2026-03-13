import {
  isPodcastMediumId,
  isAlbumMediumId,
  isArtistMediumId,
  parseMediumId,
  type AddByRSSResourceType,
} from '@podverse/helpers';

import type { AddByRSSMappedFeed } from './types.js';

export const getAddByRSSResourceTypeFromMappedFeed = (
  mappedFeed: AddByRSSMappedFeed | null | undefined
): AddByRSSResourceType => {
  const mediumId = parseMediumId(mappedFeed?.channel?.channel?.medium_id);
  if (isArtistMediumId(mediumId)) {
    return 'artists';
  }
  if (isAlbumMediumId(mediumId)) {
    return 'albums';
  }
  if (isPodcastMediumId(mediumId)) {
    return 'podcasts';
  }
  return 'podcasts';
};

export const getAddByRSSDetailRouteSegment = (resourceType: AddByRSSResourceType): string => {
  switch (resourceType) {
    case 'artists':
      return 'artist';
    case 'albums':
      return 'album';
    case 'tracks':
      return 'track';
    case 'podcasts':
      return 'podcast';
    case 'episodes':
      return 'episode';
    case 'livestreams':
      return 'livestream';
    default:
      return 'podcast';
  }
};

/** Route segment for item (episode/track) detail; usable for web paths or RN deep links. */
export const getAddByRSSItemRouteSegment = (
  resourceType: 'episodes' | 'tracks'
): 'episode' | 'track' => {
  return resourceType === 'tracks' ? 'track' : 'episode';
};
