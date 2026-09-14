import { articleStrippedTitle, primaryListArtworkUrl } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';
import { htmlToPlainText } from '@podverse/helpers/html';

import { requestWithMobileAuthRefresh } from '../../auth';
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
import type { HomeRangeOption, HomeSortOption } from '../../prefs/homeListPrefs';
import {
  DEFAULT_HOME_RANGE,
  DEFAULT_HOME_SORT,
  homeSortToApiRange,
  homeSortToApiSort,
} from '../../prefs/homeListPrefs';
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
  /**
   * When this show last published. ISO string or epoch (seconds or ms). The row renders the
   * localized date under the title; omit or null when nothing usable is known.
   */
  updatedAt?: string | number | null;
  /** Set for Podcasts subscription rows so taps can route by origin. */
  source?: SubscriptionSource;
  /**
   * Plain-text episode snippet for item rows. Null when the payload has no description (channel
   * rows, directory stubs).
   */
  description?: string | null;
  /**
   * Duration in seconds as a string (DTO `item_about.duration`). Null when unknown or not an item.
   */
  duration?: string | null;
  /**
   * Set only for subscription rows. The other media types list content rather than follows, and
   * "how many unseen" is a question only a subscription can answer.
   */
  metadata?: HomeRowMetadata;
};

type HomeFeedOptions = {
  /** Listen-count window, used only while `sort` is popularity. */
  range?: HomeRangeOption;
  /** List order. Podcasts and Episodes apply it locally; the other types pass it to the API. */
  sort?: HomeSortOption;
};

const toDirectorySort = (sort: HomeSortOption): 'recent' | 'top' => {
  const apiSort = homeSortToApiSort(sort);
  return apiSort === 'a_z' ? 'recent' : apiSort;
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

const toArtworkPartials = (value: unknown) => {
  if (!Array.isArray(value)) {
    return [];
  }

  const images: { url: string; image_width_size: number | null; is_resized: boolean }[] = [];
  for (const maybeImage of value) {
    if (!isObjectLike(maybeImage)) {
      continue;
    }

    const url = getNonEmptyTrimmedStringProperty(maybeImage, 'url');
    if (url === null) {
      continue;
    }

    const width = maybeImage.image_width_size;
    images.push({
      image_width_size: typeof width === 'number' ? width : null,
      is_resized: maybeImage.is_resized === true,
      url,
    });
  }
  return images;
};

const readImageUrl = (record: Record<string, unknown>): string | null => {
  const fromHelpers = primaryListArtworkUrl(
    toArtworkPartials(record.item_images),
    toArtworkPartials(record.channel_images)
  );
  if (fromHelpers !== null) {
    return fromHelpers;
  }

  return (
    getNonEmptyTrimmedStringProperty(record, 'image') ??
    getNonEmptyTrimmedStringProperty(record, 'artwork') ??
    getNonEmptyTrimmedStringProperty(record, 'image_url') ??
    getNonEmptyTrimmedStringProperty(record, 'imageUrl')
  );
};

export const readUpdatedAt = (value: unknown): string | number | null => {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (trimmed.length === 0) {
      return null;
    }
    return Number.isNaN(Date.parse(trimmed)) ? null : trimmed;
  }
  return null;
};

export const readChannelUpdatedAt = (record: Record<string, unknown>): string | number | null => {
  const about = record.channel_about;
  if (isObjectLike(about)) {
    const fromAbout = readUpdatedAt(about.last_pub_date);
    if (fromAbout !== null) {
      return fromAbout;
    }
  }
  return readUpdatedAt(record.last_pub_date);
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

export type NormalizeChannelRowsOptions = {
  /**
   * When true, put the channel host/author on the row subtitle (Browse Podcasts / Search-style
   * discovery). Default keeps other channel lists (Videos, Artists, Albums) title + date only.
   */
  includeAuthor?: boolean;
};

export const normalizeChannelRows = (
  items: unknown[],
  options: NormalizeChannelRowsOptions = {}
): HomeFeedRowData[] => {
  const includeAuthor = options.includeAuthor === true;
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

    const subtitle = includeAuthor
      ? (readStringFromNestedRecord(item, 'channel_about', 'author') ??
        getNonEmptyTrimmedStringProperty(item, 'author'))
      : (getNonEmptyTrimmedStringProperty(item, 'author') ??
        getNonEmptyTrimmedStringProperty(item, 'link') ??
        readStringFromNestedRecord(item, 'owner', 'name'));

    rows.push({
      id,
      imageUrl: readImageUrl(item),
      subtitle,
      title,
      updatedAt: readChannelUpdatedAt(item),
    });
  }

  return rows;
};

export const normalizeItemRows = (items: unknown[]): HomeFeedRowData[] => {
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

export const normalizeClipRows = (items: unknown[]): HomeFeedRowData[] => {
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
  const plainDescription = htmlToPlainText(item.item_description?.value);
  const duration = item.item_about?.duration?.trim() ?? '';

  return {
    description: plainDescription.length > 0 ? plainDescription : null,
    duration: duration.length > 0 ? duration : null,
    id: item.id_text,
    imageUrl: getItemPrimaryImageUrl(item),
    subtitle: item.channel?.title ?? null,
    title: item.title ?? item.id_text,
    updatedAt: item.pub_date ?? null,
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
    updatedAt: channel.latestItemPubDateMs,
  };
};

/**
 * Attach what each subscription row says about itself, from the device.
 *
 * The three reads run together and are indexed once rather than queried per row, so a long
 * subscription list costs the same three queries a short one does.
 *
 * Every source is local. A row states its latest episode, whether it has unseen episodes,
 * downloads, and whether it is on the air with no connection at all — the live status being the
 * one piece that had to be synced ahead of time, because live items are filtered out of every
 * regular item query and nothing already stored implies one.
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

/**
 * Channels with at least one complete download that are not in the current subscription set.
 * Home Podcasts shows these in a footer section so offline-only shows stay reachable.
 */
export const fetchUnsubscribedDownloadHomeRows = async (): Promise<HomeFeedRowData[]> => {
  const subscribed = await subscriptionsRepository.list({ sort: DEFAULT_HOME_SORT });
  const subscribedIds = new Set(subscribed.map((channel) => channel.idText));
  const channels = await downloadsRepository.listUnsubscribedDownloadChannels(subscribedIds);

  return channels.map((channel) => ({
    id: channel.channelIdText,
    imageUrl: channel.imageUrl,
    metadata: {
      downloadedCount: channel.downloadedCount,
      isLive: false,
      latestItemPubDateMs: null,
      unseenBadge: null,
    },
    source: 'directory',
    subtitle: null,
    title: channel.title,
  }));
};

/**
 * Completed downloads as Home Episodes / Tracks rows. Used while Offline Mode is on so those
 * chips list only playable local files rather than the full stored window.
 */
export const fetchDownloadedHomeFeedRows = async (
  mediaType: 'episodes' | 'tracks'
): Promise<HomeFeedRowData[]> => {
  const completed = await downloadsRepository.listByStatus('complete');
  const wantVideo = mediaType === 'tracks';

  return completed
    .filter((record) => (wantVideo ? record.mediaType === 'video' : record.mediaType === 'audio'))
    .map((record) => ({
      id: record.itemIdText,
      imageUrl: record.artworkUrl,
      subtitle: record.channelTitle,
      title: record.title ?? record.itemIdText,
      updatedAt: record.updatedAt,
    }));
};

export const fetchHomeFeedRows = async (
  mediaType: HomeMediaType,
  authDeps: HomeFeedAuthDeps,
  options: HomeFeedOptions = {}
): Promise<HomeFeedRowData[]> => {
  const sort = options.sort ?? DEFAULT_HOME_SORT;
  const range = options.range ?? DEFAULT_HOME_RANGE;

  if (mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums') {
    // Channel chips read local follows only. Kind splits podcasts / artists / albums so a music
    // follow never appears under Podcasts and the reverse.
    const kind =
      mediaType === 'podcasts' ? 'podcasts' : mediaType === 'artists' ? 'artists' : 'albums';

    if (
      sort === 'popularity' &&
      authDeps.status === 'authenticated' &&
      !(await subscriptionsRepository.hasPopularityRanks(range))
    ) {
      try {
        await subscriptionsRepository.refreshPopularityRanks(authDeps, range);
      } catch {
        // Keep the unranked local list. A missing rank sorts after a known one, which is still a
        // complete answer for the follows this device already has.
      }
    }
    const subscribed = await subscriptionsRepository.list({ kind, sort });
    return attachSubscriptionMetadata(subscribed);
  }

  if (mediaType === 'episodes') {
    // Episodes for subscribed channels come from the device, so this list reads, filters, and
    // sorts the same with no connection. The ranking is local rather than server-side as a result.
    if (
      sort === 'popularity' &&
      authDeps.status === 'authenticated' &&
      !(await channelItemsRepository.hasPopularityRanks(range))
    ) {
      try {
        await channelItemsRepository.refreshPopularityRanks(authDeps, range);
      } catch {
        // Keep the unranked recency window. Same set either way — only the order is missing.
      }
    }
    const podcastChannels = await subscriptionsRepository.list({ kind: 'podcasts', sort });
    const podcastChannelIds = podcastChannels.map((channel) => channel.idText);
    const stored = await channelItemsRepository.listSubscribed({
      channelIdTexts: podcastChannelIds,
      sort,
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
        range: homeSortToApiRange(sort, range),
        sort: toDirectorySort(sort),
        type: 'subscribed',
      })
    );
    // Subscribed items have recency and popularity endpoints, not a title endpoint, so A-Z is
    // applied here to the page that came back. Same set either way — this path exists to fill a
    // screen while the item sync catches up, not to be a second source of episodes.
    return applyHomeSort(normalizeItemRows(response.data), sort);
  }

  if (mediaType === 'tracks') {
    // Tracks from followed albums/artists, assembled from the device the same way Episodes are.
    const musicChannels = await subscriptionsRepository.list({ sort });
    const musicChannelIds = musicChannels
      .filter((channel) => channel.kind === 'artists' || channel.kind === 'albums')
      .map((channel) => channel.idText);
    const stored = await channelItemsRepository.listSubscribed({
      channelIdTexts: musicChannelIds,
      sort,
    });
    if (stored.length > 0) {
      return mapItemsToHomeFeedRows(stored);
    }

    if (authDeps.status !== 'authenticated') {
      return [];
    }

    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqItemGetMany({
        category: null,
        medium: 'music',
        page: HOME_FEED_PAGE,
        range: homeSortToApiRange(sort, range),
        sort: toDirectorySort(sort),
        type: 'subscribed',
      })
    );
    return applyHomeSort(normalizeItemRows(response.data), sort);
  }

  if (mediaType === 'clips') {
    // The subscribed clip list is account-backed. Signed-out Home never asks the global directory —
    // the screen decides between a login fill and a Browse CTA.
    if (authDeps.status !== 'authenticated') {
      return [];
    }

    const directorySort = toDirectorySort(sort);
    const directoryRange = homeSortToApiRange(sort, range);
    const response = await requestWithMobileAuthRefresh(authDeps, async (api) =>
      api.reqClipGetManyPublic({
        category: null,
        medium: 'podcasts',
        page: HOME_FEED_PAGE,
        range: directoryRange,
        sort: directorySort,
        type: 'subscribed',
      })
    );
    return applyHomeSort(normalizeClipRows(response.data), sort);
  }

  return [];
};
