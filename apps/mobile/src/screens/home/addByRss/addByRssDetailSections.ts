import type { AddByRSSResourceType } from '@podverse/helpers';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';

import { addByRssLiveItemKey } from '../../../lib/addByRss/liveItemDetail';
import { addByRssEpisodeItemKey } from '../../../lib/addByRss/localResourceData';
import type { AddByRssDetailTab } from '../../../prefs/detailListPrefs';

export const ADD_BY_RSS_SECTION_LABEL_KEYS: Record<AddByRssDetailTab, string> = {
  about: 'info.about',
  albums: 'media.music.albums',
  boosts: 'value.boost',
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
 * channel remote items, and is never offered on an artist feed. Boosts sits immediately before
 * Funding when this feed's MetaBoost capability exposes a public message list. Funding and
 * People follow when the feed lists them. Music feeds never offer Downloaded.
 */
export const resolveAddByRssSections = ({
  hasBoosts = false,
  hasFunding,
  hasPeople,
  hasPodroll,
  hasRemoteItems,
  isArtistFeed,
  isMusicFeed,
}: {
  hasBoosts?: boolean;
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
  if (hasBoosts) {
    sections.push('boosts');
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

export type AddByRssBoostItemNavigation =
  | { screen: 'AddByRssEpisodeDetail'; params: { feedIdText: string; itemKey: string } }
  | { screen: 'AddByRssLivestreamDetail'; params: { feedIdText: string; liveItemKey: string } }
  | { screen: 'AddByRssTrackDetail'; params: { feedIdText: string; itemKey: string } };

export const addByRssBoostScopeType = (
  resourceType: AddByRSSResourceType
): 'album' | 'artist' | 'channel' => {
  if (resourceType === 'artists') {
    return 'artist';
  }
  if (isAddByRssMusicFeed(resourceType)) {
    return 'album';
  }
  return 'channel';
};

/**
 * Open the stored episode, track, or livestream whose guid matches. A live item wins over a
 * regular item with the same guid.
 */
export const resolveAddByRssBoostItemNavigation = (input: {
  feedIdText: string;
  feedUrl: string;
  isMusicFeed: boolean;
  itemGuid: string;
  mappedFeed: AddByRSSMappedFeed;
}): AddByRssBoostItemNavigation | null => {
  const guid = input.itemGuid.trim();
  if (guid === '') {
    return null;
  }

  for (let index = 0; index < input.mappedFeed.liveItems.length; index += 1) {
    const bundle = input.mappedFeed.liveItems[index];
    if (bundle === undefined) {
      continue;
    }
    const liveGuid = bundle.item.guid?.trim() ?? '';
    if (liveGuid !== '' && liveGuid === guid) {
      return {
        params: {
          feedIdText: input.feedIdText,
          liveItemKey: addByRssLiveItemKey(bundle, index),
        },
        screen: 'AddByRssLivestreamDetail',
      };
    }
  }

  const itemKey = addByRssEpisodeItemKey(input.mappedFeed, {
    feed_url: input.feedUrl,
    guid,
  });
  if (itemKey === null) {
    return null;
  }
  if (input.isMusicFeed) {
    return {
      params: { feedIdText: input.feedIdText, itemKey },
      screen: 'AddByRssTrackDetail',
    };
  }
  return {
    params: { feedIdText: input.feedIdText, itemKey },
    screen: 'AddByRssEpisodeDetail',
  };
};
