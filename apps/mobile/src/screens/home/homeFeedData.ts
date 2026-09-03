import { articleStrippedTitle } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';

import { createMobileApiRequestService, requestWithMobileAuthRefresh } from '../../auth';
import type { AuthStatus } from '../../auth/AuthProvider';
import type {
  MobileAuthRequestContext,
  SubscribedChannel,
  SubscriptionSource,
} from '../../data/repositories';
import {
  channelItemsRepository,
  channelLiveStatusRepository,
  channelSeenRepository,
  downloadsRepository,
  subscriptionsRepository,
} from '../../data/repositories';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import type { HomeSortOption } from '../../prefs/homeListPrefs';
import { DEFAULT_HOME_SORT } from '../../prefs/homeListPrefs';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import type { HomeRowMetadata } from './homeRowMetadata';
import { buildHomeRowMetadata } from './homeRowMetadata';

export type HomeFeedRowData = {
  id: string;
  imageUrl: string | null;
  /** Source-local identity for detail routing; directory rows use their channel id text. */
  sourceId?: string;
  subtitle: string | null;
  title: string;
  /** Set for Podcasts subscription rows so taps can route by origin. */
  source?: SubscriptionSource;
  /**
   * Set only for subscription rows. The other media types list content rather than follows, and
   * "how many unseen" is a question only a subscription can answer.
   */
  metadata?: HomeRowMetadata;
};

type HomeFeedOptions = {
  /**
   * Applies to the two locally-read views, Podcasts and Episodes. The remaining media types are
   * server-ranked and ignore it.
   */
  sort?: HomeSortOption;
};

/**
 * Composed from the repository context rather than restated, so the shape cannot drift from what
 * `requestWithMobileAuthRefresh` actually needs.
 */
type HomeFeedAuthDeps = MobileAuthRequestContext & {
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

/**
 * Map a full item to a feed row. Used wherever rows come from typed `DTOItem`s rather than a raw
 * list payload, so a stored episode and a freshly fetched one render identically.
 */
export const mapItemToHomeFeedRow = (item: DTOItem): HomeFeedRowData => {
  return {
    id: item.id_text,
    imageUrl: getItemPrimaryImageUrl(item),
    subtitle: item.channel?.title ?? null,
    title: item.title ?? item.id_text,
  };
};

export const mapItemsToHomeFeedRows = (items: readonly DTOItem[]): HomeFeedRowData[] => {
  return items.map(mapItemToHomeFeedRow).filter((row) => row.id.length > 0);
};

const applyHomeSort = (rows: HomeFeedRowData[], sort: HomeSortOption): HomeFeedRowData[] => {
  if (sort !== 'alphabetical') {
    return rows;
  }
  return [...rows].sort((a, b) =>
    articleStrippedTitle(a.title).localeCompare(articleStrippedTitle(b.title))
  );
};

const mapSubscribedChannelToRow = (
  channel: SubscribedChannel,
  metadata: HomeRowMetadata | undefined
): HomeFeedRowData => {
  return {
    id: channel.idText,
    imageUrl: channel.imageUrl,
    metadata,
    sourceId: channel.sourceIdText,
    source: channel.source,
    subtitle: null,
    title: channel.title,
  };
};

/**
 * Attach what each subscription row says about itself, from the device.
 *
 * The three reads run together and are indexed once rather than queried per row, so a long
 * subscription list costs the same three queries a short one does.
 *
 * Every source is local. A row states its latest episode, unseen count, downloads, and whether it
 * is on the air with no connection at all — the live status being the one piece that had to be
 * synced ahead of time, because live items are filtered out of every regular item query and nothing
 * already stored implies one.
 */
const attachSubscriptionMetadata = async (
  subscribed: readonly SubscribedChannel[]
): Promise<HomeFeedRowData[]> => {
  const [broadcastingKeys, downloadedCountByChannel, unseen] = await Promise.all([
    channelLiveStatusRepository.listBroadcastingKeys(),
    downloadsRepository.countCompletedByChannel(),
    channelSeenRepository.listUnseen(),
  ]);

  const metadata = buildHomeRowMetadata(subscribed, {
    broadcastingKeys,
    downloadedCountByChannel,
    unseen,
  });

  return subscribed.map((channel) =>
    mapSubscribedChannelToRow(channel, metadata.get(channel.idText))
  );
};

export const fetchHomeFeedRows = async (
  mediaType: HomeMediaType,
  authDeps: HomeFeedAuthDeps,
  options: HomeFeedOptions = {}
): Promise<HomeFeedRowData[]> => {
  if (mediaType === 'podcasts') {
    // The Podcasts view mixes directory follows + add-by-RSS from the shared offline-first store.
    // Read regardless of auth state: subscriptions are device-local, so a signed-out user with
    // subscriptions sees them here exactly as a signed-in one does.
    //
    // Read before the API is even consulted, and with no directory fallback, because Home shows
    // what the user subscribed to and nothing else. An unconfigured API or no connection changes
    // nothing about that list.
    const subscribed = await subscriptionsRepository.list({
      sort: options.sort ?? DEFAULT_HOME_SORT,
    });
    return attachSubscriptionMetadata(subscribed);
  }

  const apiRequestService = createMobileApiRequestService(authDeps.accessToken);
  if (apiRequestService === null) {
    return [];
  }

  const listType = authDeps.status === 'authenticated' ? 'subscribed' : 'global';

  if (mediaType === 'episodes') {
    // Episodes for subscribed channels come from the device, so this list reads, filters, and
    // sorts the same with no connection. The ranking is local rather than server-side as a result.
    const stored = await channelItemsRepository.listSubscribed({
      sort: options.sort ?? DEFAULT_HOME_SORT,
    });
    if (stored.length > 0) {
      return mapItemsToHomeFeedRows(stored);
    }

    // Nothing stored yet — a fresh install whose first sync has not reached episodes. Only an
    // account can be asked to fill that gap: subscriptions are device-local, so the server can
    // answer "what is this user subscribed to" for a signed-in device and nothing better than the
    // global directory for a signed-out one. Home does not show the directory, so a signed-out
    // device waits for the queue instead.
    if (authDeps.status !== 'authenticated') {
      return [];
    }

    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqItemGetMany({
        category: null,
        medium: 'podcasts',
        page: HOME_FEED_PAGE,
        range: null,
        sort: 'recent',
        type: 'subscribed',
      })
    );
    // The subscribed-items endpoint ranks by recency only, so a title order is applied here to the
    // page it returned. Same set either way — this path exists to fill a screen while the item sync
    // catches up, not to be a second source of episodes.
    return applyHomeSort(normalizeItemRows(response.data), options.sort ?? DEFAULT_HOME_SORT);
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
