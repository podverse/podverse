import type { DTOAccount, DTOPlaylist, QueryParamsMedium } from '@podverse/helpers';

import { createMobileApiRequestService, requestWithMobileAuthRefresh } from '../../auth';
import type { MobileAuthRequestContext } from '../../data/repositories';
import type { HomeFeedRowData } from '../home/homeFeedData';
import {
  mapItemsToHomeFeedRows,
  normalizeChannelRows,
  normalizeClipRows,
} from '../home/homeFeedData';
import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';
import { isBrowseCategoryMediaType } from './browseTypes';

const BROWSE_FEED_PAGE = 1;

type BrowseFeedAuthDeps = MobileAuthRequestContext;

export type BrowseFeedOptions = {
  category: string | null;
  range: BrowseRangeOption;
};

export type BrowseFeedResult =
  | { kind: 'media'; rows: HomeFeedRowData[] }
  | { kind: 'playlists'; playlists: DTOPlaylist[] }
  | { kind: 'users'; accounts: DTOAccount[] };

export const emptyBrowseFeed = (mediaType: BrowseMediaType): BrowseFeedResult => {
  if (mediaType === 'playlists') {
    return { kind: 'playlists', playlists: [] };
  }
  if (mediaType === 'users') {
    return { kind: 'users', accounts: [] };
  }
  return { kind: 'media', rows: [] };
};

const listType = (category: string | null): 'global' | 'category' => {
  return category !== null ? 'category' : 'global';
};

/** Match web Podcasts / Episodes / Clips: `av` folds podcast- and video-medium channels together. */
const channelMedium = (mediaType: BrowseMediaType): QueryParamsMedium => {
  if (mediaType === 'artists') {
    return 'publisher-music';
  }
  if (mediaType === 'albums') {
    return 'music';
  }
  return 'av';
};

const itemMedium = (mediaType: BrowseMediaType): QueryParamsMedium => {
  return mediaType === 'tracks' ? 'music' : 'av';
};

/**
 * Directory lists are online-only. Home reads subscriptions from the device; Browse asks the
 * global (or category) endpoints instead.
 *
 * Playlists and users stay as their DTOs so the catalog rows can show item count, description,
 * creator, and bio. Those types have no artwork.
 */
export const fetchBrowseFeedRows = async (
  mediaType: BrowseMediaType,
  authDeps: BrowseFeedAuthDeps,
  options: BrowseFeedOptions
): Promise<BrowseFeedResult> => {
  const apiRequestService = createMobileApiRequestService(authDeps.accessToken);
  if (apiRequestService === null) {
    return emptyBrowseFeed(mediaType);
  }

  const category =
    isBrowseCategoryMediaType(mediaType) && options.category !== null ? options.category : null;
  const type = listType(category);
  const range = options.range;

  if (mediaType === 'playlists') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqPlaylistGetMany({
        medium: 'all',
        page: BROWSE_FEED_PAGE,
        range,
        sort: 'top',
        type: 'public',
      })
    );
    return { kind: 'playlists', playlists: response.data };
  }

  if (mediaType === 'users') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqAccountGetMany({
        page: BROWSE_FEED_PAGE,
        range,
        sort: 'top',
        type: 'global',
      })
    );
    return { kind: 'users', accounts: response.data };
  }

  if (mediaType === 'clips') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqClipGetManyPublic({
        category,
        medium: 'av',
        page: BROWSE_FEED_PAGE,
        range,
        sort: 'top',
        type,
      })
    );
    return { kind: 'media', rows: normalizeClipRows(response.data) };
  }

  if (mediaType === 'episodes' || mediaType === 'tracks') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqItemGetMany({
        category,
        medium: itemMedium(mediaType),
        page: BROWSE_FEED_PAGE,
        range,
        sort: 'top',
        type,
      })
    );
    if (mediaType === 'episodes') {
      return { kind: 'media', rows: mapItemsToHomeFeedRows(response.data) };
    }
    return { kind: 'media', rows: mapItemsToHomeFeedRows(response.data, { compact: true }) };
  }

  const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
    api.reqChannelGetMany({
      category,
      medium: channelMedium(mediaType),
      page: BROWSE_FEED_PAGE,
      range,
      sort: 'top',
      type,
    })
  );
  return {
    kind: 'media',
    rows: normalizeChannelRows(response.data, {
      includeAuthor: mediaType === 'podcasts' || mediaType === 'albums',
    }),
  };
};
