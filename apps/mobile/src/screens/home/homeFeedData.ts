import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';

import { createMobileApiRequestService, requestWithMobileAuthRefresh } from '../../auth';
import type { AuthStatus } from '../../auth/AuthProvider';
import type { SubscribedChannel, SubscriptionSource } from '../../data/repositories';
import { subscriptionsRepository } from '../../data/repositories';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import type { SubscriptionListFilter } from '../../prefs/subscriptionFilter';

export type HomeFeedRowData = {
  id: string;
  imageUrl: string | null;
  subtitle: string | null;
  title: string;
  /** Set only for the authenticated Podcasts subscribed view so taps can route by origin. */
  source?: SubscriptionSource;
};

type HomeFeedOptions = {
  /** Applies only to the authenticated Podcasts subscribed view (mixed by default). */
  subscriptionFilter?: SubscriptionListFilter;
};

type HomeFeedAuthDeps = {
  accessToken: string | null;
  clearSession: () => Promise<void>;
  refreshToken: string | null;
  setTokens: (params: { accessToken: string; refreshToken: string }) => Promise<void>;
  status: AuthStatus;
};

const HOME_FEED_PAGE = 1;

const readStringFromNestedRecord = (
  record: Record<string, unknown>,
  nestedKey: string,
  fieldKey: string
): string | null => {
  const nestedValue = record[nestedKey];
  if (!isObjectLike(nestedValue)) {
    return null;
  }

  return getNonEmptyTrimmedStringProperty(nestedValue, fieldKey);
};

const readImageUrl = (record: Record<string, unknown>): string | null => {
  const directImage =
    getNonEmptyTrimmedStringProperty(record, 'image') ??
    getNonEmptyTrimmedStringProperty(record, 'artwork') ??
    getNonEmptyTrimmedStringProperty(record, 'image_url') ??
    getNonEmptyTrimmedStringProperty(record, 'imageUrl');
  if (directImage !== null) {
    return directImage;
  }

  const imageCollections = ['channel_images', 'item_images'];
  for (const imageCollectionKey of imageCollections) {
    const maybeImages = record[imageCollectionKey];
    if (!Array.isArray(maybeImages)) {
      continue;
    }

    for (const maybeImage of maybeImages) {
      if (!isObjectLike(maybeImage)) {
        continue;
      }

      const url = getNonEmptyTrimmedStringProperty(maybeImage, 'url');
      if (url !== null) {
        return url;
      }
    }
  }

  return null;
};

const normalizeId = (record: Record<string, unknown>): string | null => {
  const idText =
    getNonEmptyTrimmedStringProperty(record, 'id_text') ??
    getNonEmptyTrimmedStringProperty(record, 'idText');
  if (idText !== null) {
    return idText;
  }

  const numericId = record.id;
  if (typeof numericId === 'number') {
    return String(numericId);
  }

  return null;
};

const normalizeChannelRows = (items: unknown[]): HomeFeedRowData[] => {
  const rows: HomeFeedRowData[] = [];

  for (const item of items) {
    if (!isObjectLike(item)) {
      continue;
    }

    const id = normalizeId(item);
    const title =
      getNonEmptyTrimmedStringProperty(item, 'title') ??
      getNonEmptyTrimmedStringProperty(item, 'slug');
    if (id === null || title === null) {
      continue;
    }

    const subtitle =
      getNonEmptyTrimmedStringProperty(item, 'author') ??
      getNonEmptyTrimmedStringProperty(item, 'link') ??
      readStringFromNestedRecord(item, 'owner', 'name');

    rows.push({
      id,
      imageUrl: readImageUrl(item),
      subtitle,
      title,
    });
  }

  return rows;
};

const normalizeItemRows = (items: unknown[]): HomeFeedRowData[] => {
  const rows: HomeFeedRowData[] = [];

  for (const item of items) {
    if (!isObjectLike(item)) {
      continue;
    }

    const id = normalizeId(item);
    const title = getNonEmptyTrimmedStringProperty(item, 'title');
    if (id === null || title === null) {
      continue;
    }

    const subtitle =
      getNonEmptyTrimmedStringProperty(item, 'podcast_title') ??
      getNonEmptyTrimmedStringProperty(item, 'channel_title') ??
      getNonEmptyTrimmedStringProperty(item, 'author');

    rows.push({
      id,
      imageUrl: readImageUrl(item),
      subtitle,
      title,
    });
  }

  return rows;
};

const normalizeClipRows = (items: unknown[]): HomeFeedRowData[] => {
  const rows: HomeFeedRowData[] = [];

  for (const item of items) {
    if (!isObjectLike(item)) {
      continue;
    }

    const id = normalizeId(item);
    const title = getNonEmptyTrimmedStringProperty(item, 'title');
    if (id === null || title === null) {
      continue;
    }

    const subtitle =
      getNonEmptyTrimmedStringProperty(item, 'podcast_title') ??
      getNonEmptyTrimmedStringProperty(item, 'channel_title') ??
      getNonEmptyTrimmedStringProperty(item, 'item_title');

    rows.push({
      id,
      imageUrl: readImageUrl(item),
      subtitle,
      title,
    });
  }

  return rows;
};

const mapSubscribedChannelToRow = (channel: SubscribedChannel): HomeFeedRowData => {
  return {
    id: channel.idText,
    imageUrl: channel.imageUrl,
    source: channel.source,
    subtitle: null,
    title: channel.title,
  };
};

export const fetchHomeFeedRows = async (
  mediaType: HomeMediaType,
  authDeps: HomeFeedAuthDeps,
  options: HomeFeedOptions = {}
): Promise<HomeFeedRowData[]> => {
  const apiRequestService = createMobileApiRequestService(authDeps.accessToken);
  if (apiRequestService === null) {
    return [];
  }

  const listType = authDeps.status === 'authenticated' ? 'subscribed' : 'global';

  if (mediaType === 'podcasts') {
    // The Podcasts view mixes directory follows + add-by-RSS from the shared offline-first store
    // (9b.8 / 8.16). Read regardless of auth state: subscriptions are device-local (701), so a
    // signed-out user with subscriptions sees them here exactly as a signed-in one does.
    const subscribed = await subscriptionsRepository.list({
      filter: options.subscriptionFilter ?? 'all',
    });
    if (subscribed.length > 0) {
      return subscribed.map(mapSubscribedChannelToRow);
    }
    if (authDeps.status === 'authenticated') {
      return [];
    }

    // Nothing subscribed yet and no account — fall back to the global directory so a fresh install
    // has something to browse rather than an empty Home.
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqChannelGetMany({
        category: null,
        medium: 'podcasts',
        page: HOME_FEED_PAGE,
        range: null,
        sort: 'recent',
        type: listType,
      })
    );
    return normalizeChannelRows(response.data);
  }

  if (mediaType === 'episodes') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqItemGetMany({
        category: null,
        medium: 'podcasts',
        page: HOME_FEED_PAGE,
        range: null,
        sort: 'recent',
        type: listType,
      })
    );
    return normalizeItemRows(response.data);
  }

  if (mediaType === 'clips') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqClipGetManyPublic({
        category: null,
        medium: 'podcasts',
        page: HOME_FEED_PAGE,
        range: null,
        sort: 'recent',
        type: listType,
      })
    );
    return normalizeClipRows(response.data);
  }

  if (mediaType === 'artists' || mediaType === 'albums') {
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqChannelGetMany({
        category: null,
        medium: 'music',
        page: HOME_FEED_PAGE,
        range: null,
        sort: 'recent',
        type: 'global',
      })
    );
    return normalizeChannelRows(response.data);
  }

  const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
    api.reqItemGetMany({
      category: null,
      medium: 'music',
      page: HOME_FEED_PAGE,
      range: null,
      sort: 'recent',
      type: 'global',
    })
  );
  return normalizeItemRows(response.data);
};
