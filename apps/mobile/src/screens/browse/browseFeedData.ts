import type { QueryParamsMedium } from '@podverse/helpers';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';

import { createMobileApiRequestService, requestWithMobileAuthRefresh } from '../../auth';
import type { MobileAuthRequestContext } from '../../data/repositories';
import type { HomeFeedRowData } from '../home/homeFeedData';
import { normalizeChannelRows, normalizeClipRows, normalizeItemRows } from '../home/homeFeedData';
import type { BrowseMediaType, BrowseRangeOption } from './browseTypes';
import { isBrowseCategoryMediaType } from './browseTypes';

const BROWSE_FEED_PAGE = 1;

type BrowseFeedAuthDeps = MobileAuthRequestContext;

export type BrowseFeedOptions = {
  category: string | null;
  range: BrowseRangeOption;
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

const nestedDisplayName = (record: Record<string, unknown>, ownerKey: string): string | null => {
  const owner = record[ownerKey];
  if (!isObjectLike(owner)) {
    return null;
  }
  const profile = owner.account_profile;
  if (isObjectLike(profile)) {
    return getNonEmptyTrimmedStringProperty(profile, 'display_name');
  }
  return getNonEmptyTrimmedStringProperty(owner, 'display_name');
};

const normalizePlaylistRows = (items: unknown[]): HomeFeedRowData[] => {
  const rows: HomeFeedRowData[] = [];

  for (const item of items) {
    if (!isObjectLike(item)) {
      continue;
    }

    const id = getNonEmptyTrimmedStringProperty(item, 'id_text');
    const title = getNonEmptyTrimmedStringProperty(item, 'title') ?? id;
    if (id === null || title === null) {
      continue;
    }

    rows.push({
      id,
      imageUrl: null,
      subtitle: nestedDisplayName(item, 'account'),
      title,
    });
  }

  return rows;
};

const normalizeUserRows = (items: unknown[]): HomeFeedRowData[] => {
  const rows: HomeFeedRowData[] = [];

  for (const item of items) {
    if (!isObjectLike(item)) {
      continue;
    }

    const id = getNonEmptyTrimmedStringProperty(item, 'id_text');
    const profile = item.account_profile;
    const title =
      (isObjectLike(profile) ? getNonEmptyTrimmedStringProperty(profile, 'display_name') : null) ??
      id;
    if (id === null || title === null) {
      continue;
    }

    rows.push({
      id,
      imageUrl: null,
      subtitle: null,
      title,
    });
  }

  return rows;
};

/**
 * Directory lists are online-only. Home reads subscriptions from the device; Browse asks the
 * global (or category) endpoints instead.
 */
export const fetchBrowseFeedRows = async (
  mediaType: BrowseMediaType,
  authDeps: BrowseFeedAuthDeps,
  options: BrowseFeedOptions
): Promise<HomeFeedRowData[]> => {
  const apiRequestService = createMobileApiRequestService(authDeps.accessToken);
  if (apiRequestService === null) {
    return [];
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
    return normalizePlaylistRows(response.data);
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
    return normalizeUserRows(response.data);
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
    return normalizeClipRows(response.data);
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
    return normalizeItemRows(response.data);
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
  return normalizeChannelRows(response.data, {
    includeAuthor: mediaType === 'podcasts' || mediaType === 'albums',
  });
};
