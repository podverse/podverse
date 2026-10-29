import type { DTOAccount, DTOPlaylist, QueryParamsMedium } from '@podverse/helpers';

import { createMobileApiRequestService, requestWithMobileAuthRefresh } from '../../auth';
import type { MobileAuthRequestContext } from '../../data/repositories';
import { listResponseHasMore } from '../../lib/pagination/pagedList';
import type { HomeFeedRowData } from '../home/homeFeedData';
import {
  mapItemsToHomeFeedRows,
  mapItemsToUpcomingLiveRows,
  normalizeChannelRows,
  normalizeClipRows,
} from '../home/homeFeedData';
import type { BrowseMediaType, BrowseRangeOption, BrowseSortOption } from './browseTypes';
import { browseSortToApiRange, isBrowseCategoryMediaType } from './browseTypes';

type BrowseFeedAuthDeps = MobileAuthRequestContext;

export type BrowseFeedOptions = {
  category: string | null;
  page: number;
  range: BrowseRangeOption;
  sort: BrowseSortOption;
};

export type BrowseFeedResult =
  | { kind: 'media'; rows: HomeFeedRowData[] }
  | { kind: 'playlists'; playlists: DTOPlaylist[] }
  | { kind: 'users'; accounts: DTOAccount[] };

export type BrowseFeedPage = { feed: BrowseFeedResult; hasMore: boolean };

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

const browseFeedPage = (
  feed: BrowseFeedResult,
  response: {
    data: readonly unknown[];
    meta: { count: number | null; limit: number; page: number };
  }
): BrowseFeedPage => ({
  feed,
  hasMore: listResponseHasMore(response.meta, response.data.length),
});

const itemMedium = (mediaType: BrowseMediaType): QueryParamsMedium => {
  return mediaType === 'tracks' ? 'music' : 'av';
};

/**
 * Directory lists are online-only. Home reads subscriptions from the device; Browse asks the
 * global (or category) endpoints instead. Each call reads one page in the chosen order: Recent,
 * or Top within the range. Top lists only rows counted above zero in that range, so a range with
 * no listens is an empty page and a short page ends the list. `hasMore` comes from the raw
 * response, before mapping, because livestream mapping drops stale rows from a full page.
 *
 * Playlists and users stay as their DTOs so the catalog rows can show item count, description,
 * creator, and bio. Those types have no artwork.
 */
export const fetchBrowseFeedRows = async (
  mediaType: BrowseMediaType,
  authDeps: BrowseFeedAuthDeps,
  options: BrowseFeedOptions
): Promise<BrowseFeedPage> => {
  const apiRequestService = createMobileApiRequestService(authDeps.accessToken);
  if (apiRequestService === null) {
    return { feed: emptyBrowseFeed(mediaType), hasMore: false };
  }

  const category =
    isBrowseCategoryMediaType(mediaType) && options.category !== null ? options.category : null;
  const type = listType(category);
  const sort = options.sort;
  const range = browseSortToApiRange(sort, options.range);

  if (mediaType === 'playlists') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqPlaylistGetMany({
        medium: 'all',
        page: options.page,
        range,
        sort,
        type: 'public',
      })
    );
    return browseFeedPage({ kind: 'playlists', playlists: response.data }, response);
  }

  if (mediaType === 'users') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqAccountGetMany({
        page: options.page,
        range,
        sort,
        type: 'global',
      })
    );
    return browseFeedPage({ kind: 'users', accounts: response.data }, response);
  }

  if (mediaType === 'clips') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqClipGetManyPublic({
        category,
        medium: 'av',
        page: options.page,
        range,
        sort,
        type,
      })
    );
    return browseFeedPage({ kind: 'media', rows: normalizeClipRows(response.data) }, response);
  }

  if (mediaType === 'livestreams') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqLiveItemGetManyUpcoming({
        medium: 'all',
        page: options.page,
        type: 'global',
      })
    );
    return browseFeedPage(
      { kind: 'media', rows: mapItemsToUpcomingLiveRows(response.data) },
      response
    );
  }

  if (mediaType === 'episodes' || mediaType === 'tracks') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqItemGetMany({
        category,
        medium: itemMedium(mediaType),
        page: options.page,
        range,
        sort,
        type,
      })
    );
    if (mediaType === 'episodes') {
      return browseFeedPage(
        { kind: 'media', rows: mapItemsToHomeFeedRows(response.data) },
        response
      );
    }
    return browseFeedPage(
      { kind: 'media', rows: mapItemsToHomeFeedRows(response.data, { compact: true }) },
      response
    );
  }

  const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
    api.reqChannelGetMany({
      category,
      medium: channelMedium(mediaType),
      page: options.page,
      range,
      sort,
      type,
    })
  );
  return browseFeedPage(
    {
      kind: 'media',
      rows: normalizeChannelRows(response.data, {
        includeAuthor: mediaType === 'podcasts' || mediaType === 'albums',
      }),
    },
    response
  );
};
