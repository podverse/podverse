import type { AddByRSSResourceType } from '@podverse/helpers';

import type { AddByRssDetailTab } from '../../../prefs/detailListPrefs';

export const ADD_BY_RSS_SECTION_LABEL_KEYS: Record<AddByRssDetailTab, string> = {
  about: 'info.about',
  albums: 'media.music.albums',
  downloaded: 'features.download.downloaded',
  episodes: 'media.podcast.episodes',
  funding: 'info.funding',
  people: 'info.people.people',
  podroll: 'info.podroll',
  remote_items: 'info.remote_items',
  tracks: 'media.music.tracks',
};

export const isAddByRssMusicFeed = (resourceType: AddByRSSResourceType): boolean =>
  resourceType === 'artists' || resourceType === 'albums' || resourceType === 'tracks';

export const addByRssItemsTab = (isMusicFeed: boolean): AddByRssDetailTab =>
  isMusicFeed ? 'tracks' : 'episodes';

export const isAddByRssSortableSection = (section: AddByRssDetailTab): boolean =>
  section === 'episodes' || section === 'tracks';

export const isAddByRssFilterableSection = (section: AddByRssDetailTab): boolean =>
  section === 'albums' ||
  section === 'episodes' ||
  section === 'tracks' ||
  section === 'downloaded';

/**
 * Podcast feeds offer Episodes, Downloaded, and About. Artist feeds offer Albums, Tracks, and
 * About. Album and track feeds offer Tracks and About. Podroll follows About on every feed that
 * lists podroll references. Remote Items follows Podroll on podcast and album feeds that list
 * channel remote items, and is never offered on an artist feed. Funding and People follow when
 * the feed lists them. Music feeds never offer Downloaded.
 */
export const resolveAddByRssSections = ({
  hasFunding,
  hasPeople,
  hasPodroll,
  hasRemoteItems,
  isArtistFeed,
  isMusicFeed,
}: {
  hasFunding: boolean;
  hasPeople: boolean;
  hasPodroll: boolean;
  hasRemoteItems: boolean;
  isArtistFeed: boolean;
  isMusicFeed: boolean;
}): AddByRssDetailTab[] => {
  const sections: AddByRssDetailTab[] = isArtistFeed
    ? ['albums', 'tracks', 'about']
    : isMusicFeed
      ? ['tracks', 'about']
      : ['episodes', 'downloaded', 'about'];
  if (hasPodroll) {
    sections.push('podroll');
  }
  if (hasRemoteItems && !isArtistFeed) {
    sections.push('remote_items');
  }
  if (hasFunding) {
    sections.push('funding');
  }
  if (hasPeople) {
    sections.push('people');
  }
  return sections;
};

/**
 * An artist feed opens on Albums, offline or not. A podcast feed opens on Downloaded when Offline
 * Mode is on. Otherwise the items chip.
 */
export const resolveAddByRssInitialSection = ({
  isArtistFeed,
  isMusicFeed,
  offline,
}: {
  isArtistFeed: boolean;
  isMusicFeed: boolean;
  offline: boolean;
}): AddByRssDetailTab => {
  if (isArtistFeed) {
    return 'albums';
  }
  return offline && !isMusicFeed ? 'downloaded' : addByRssItemsTab(isMusicFeed);
};
