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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (record: Record<string, unknown>, key: string): string | null => {
  const value = record[key];
  return typeof value === 'string' && value.trim().length > 0 ? value : null;
};

const readStringFromNestedRecord = (
  record: Record<string, unknown>,
  nestedKey: string,
  fieldKey: string
): string | null => {
  const nestedValue = record[nestedKey];
  if (!isRecord(nestedValue)) {
    return null;
  }

  return readString(nestedValue, fieldKey);
};

const readImageUrl = (record: Record<string, unknown>): string | null => {
  const directImage =
    readString(record, 'image') ??
    readString(record, 'artwork') ??
    readString(record, 'image_url') ??
    readString(record, 'imageUrl');
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
      if (!isRecord(maybeImage)) {
        continue;
      }

      const url = readString(maybeImage, 'url');
      if (url !== null) {
        return url;
      }
    }
  }

  return null;
};

const normalizeId = (record: Record<string, unknown>): string | null => {
  const idText = readString(record, 'id_text') ?? readString(record, 'idText');
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
    if (!isRecord(item)) {
      continue;
    }

    const id = normalizeId(item);
    const title = readString(item, 'title') ?? readString(item, 'slug');
    if (id === null || title === null) {
      continue;
    }

    const subtitle =
      readString(item, 'author') ??
      readString(item, 'link') ??
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
    if (!isRecord(item)) {
      continue;
    }

    const id = normalizeId(item);
    const title = readString(item, 'title');
    if (id === null || title === null) {
      continue;
    }

    const subtitle =
      readString(item, 'podcast_title') ??
      readString(item, 'channel_title') ??
      readString(item, 'author');

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
    if (!isRecord(item)) {
      continue;
    }

    const id = normalizeId(item);
    const title = readString(item, 'title');
    if (id === null || title === null) {
      continue;
    }

    const subtitle =
      readString(item, 'podcast_title') ??
      readString(item, 'channel_title') ??
      readString(item, 'item_title');

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
    // Authenticated Podcasts subscribed view mixes directory follows + add-by-RSS from the shared
    // offline-first cache (9b.8 / 8.16); anonymous still shows the global directory list.
    if (authDeps.status === 'authenticated') {
      const subscribed = await subscriptionsRepository.list({
        filter: options.subscriptionFilter ?? 'all',
      });
      return subscribed.map(mapSubscribedChannelToRow);
    }

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
