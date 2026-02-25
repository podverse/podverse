import type { AddByRSSMappedFeed, AddByRSSResourceType } from './types';
import {
  isPodcastMediumId,
  isAlbumMediumId,
  isArtistMediumId,
  parseMediumId,
} from './mediumHelpers';

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
