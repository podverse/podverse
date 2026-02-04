import { MediumEnum } from '@podverse/helpers';

import type { AddByRSSMappedFeed, AddByRSSResourceType } from './types';

const isPodcastMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Podcast ||
  mediumId === MediumEnum.PodcastL ||
  mediumId === MediumEnum.PublisherPodcast ||
  mediumId === MediumEnum.Video ||
  mediumId === MediumEnum.VideoL ||
  mediumId === MediumEnum.PublisherVideo ||
  mediumId === MediumEnum.PublisherAV;

const isAlbumMedium = (mediumId: number | null): boolean =>
  mediumId === MediumEnum.Music || mediumId === MediumEnum.MusicL;

const isArtistMedium = (mediumId: number | null): boolean => mediumId === MediumEnum.PublisherMusic;

const parseMediumId = (value: unknown): number | null => {
  if (typeof value === 'number') {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = parseInt(value, 10);
    return Number.isNaN(parsed) ? null : parsed;
  }
  return null;
};

export const getAddByRSSResourceTypeFromMappedFeed = (
  mappedFeed: AddByRSSMappedFeed | null | undefined
): AddByRSSResourceType => {
  const mediumId = parseMediumId(mappedFeed?.channel?.channel?.medium_id);
  if (isArtistMedium(mediumId)) {
    return 'artists';
  }
  if (isAlbumMedium(mediumId)) {
    return 'albums';
  }
  if (isPodcastMedium(mediumId)) {
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
