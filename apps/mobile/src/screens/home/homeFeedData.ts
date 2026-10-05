import { articleStrippedTitle, primaryListArtworkUrl } from '@podverse/helpers';
import type { DTOItem } from '@podverse/helpers/dto';
import { getNonEmptyTrimmedStringProperty, isObjectLike } from '@podverse/helpers/guards';
import { htmlToPlainTextPreview } from '@podverse/helpers/html';

import type { SubscribedChannel, SubscriptionSource } from '../../data/repositories';
import {
  channelItemsRepository,
  channelLiveStatusRepository,
  channelSeenRepository,
  downloadsRepository,
  homeClipsCacheRepository,
  subscriptionChannelKindFromMediumId,
  subscriptionsRepository,
} from '../../data/repositories';
import { getItemPrimaryImageUrl } from '../../data/repositories/channelItemWindow';
import {
  clipHomeRowSourceFromUnknown,
  clipToHomeRow,
  MIXED_SOURCE_CLIP_ROW_OPTIONS,
} from '../../lib/rows/homeRowMappers';
import type { HomeRangeOption, HomeSortOption } from '../../prefs/homeListPrefs';
import { DEFAULT_HOME_SORT } from '../../prefs/homeListPrefs';
import type { HomeMediaType } from '../../prefs/preferredMediaType';
import {
  appendHomeFeedReadFailure,
  HOME_FEED_METADATA_TIMEOUT_CODE,
  HOME_FEED_METADATA_TIMEOUT_MS,
  withHomeFeedReadBudget,
} from './homeFeedReadLog';
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
   * Known at the row: a Home follow is subscribed; a Downloaded-only footer row is not.
   * Passed through navigate params so the destination subscribe control does not guess.
   */
  isSubscribed?: boolean;
  /**
   * Plain-text episode snippet for item rows. Null when the payload has no description (channel
   * rows, directory stubs).
   */
  description?: string | null;
  /**
   * Duration in seconds as a string (DTO `item_about.duration`). Null when unknown or not an item.
   * Clip rows leave this unset and use `clipStartTime` / `clipEndTime` instead.
   */
  duration?: string | null;
  /**
   * Preformatted label beside Play. Wins over `duration` and over a clip start–end range, so a
   * range string is never passed through `Number()`.
   */
  durationLabel?: string | null;
  /** Clip segment bounds in seconds. The row formats these as a start–end label. */
  clipStartTime?: string | null;
  clipEndTime?: string | null;
  /**
   * Set only for subscription rows. The other media types list content rather than follows, and
   * "how many unseen" is a question only a subscription can answer.
   */
  metadata?: HomeRowMetadata;
  /**
   * The episode / track / clip a row's actions act on, for rows whose `id` identifies a container
   * (a queue or history entry) instead of the content inside it. Content rows leave it unset: their
   * `id` already is the target.
   */
  contentTarget?: HomeRowContentTarget;
  /** Parent album or artist for a track row's go-to action. */
  channelId?: string;
  /** Which go-to label and destination to use for `channelId`. */
  channelKind?: 'albums' | 'artists';
};

/** Identity of the playable resource behind a row. */
export type HomeRowContentTarget = {
  idText: string;
  kind: 'clip' | 'item';
};

/**
 * Thrown when a read is abandoned because a newer one superseded it. Callers treat this as "no
 * result", never as a failure — nothing went wrong and there is nothing to report.
 */
export class HomeFeedStaleReadError extends Error {
  constructor() {
    super('home feed read superseded');
    this.name = 'HomeFeedStaleReadError';
  }
}

export const isHomeFeedStaleRead = (error: unknown): boolean =>
  error instanceof HomeFeedStaleReadError;

type HomeFeedOptions = {
  /**
   * Consulted after each await and before each mapping pass. Returning false abandons the read with
   * `HomeFeedStaleReadError` so a superseded chip selection does not pay for parsing rows nobody
   * will see.
   */
  isCurrent?: () => boolean;
  /** Listen-count window, stored with the Home sort chip. Channel/item order reads it from SQLite. */
  range?: HomeRangeOption;
  /** List order. Channel and item chips apply it locally; clips apply A-Z on the cached page. */
  sort?: HomeSortOption;
};

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
   * When true, put the channel host/author on the row subtitle (Browse Podcasts and Albums /
   * Search-style discovery). Default keeps other channel lists (Artists) title + date only.
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

export type NormalizeItemRowsKind = 'episode' | 'track';

const readFlatItemSubtitle = (item: Record<string, unknown>): string | null => {
  return (
    getNonEmptyTrimmedStringProperty(item, 'podcast_title') ??
    getNonEmptyTrimmedStringProperty(item, 'channel_title') ??
    getNonEmptyTrimmedStringProperty(item, 'author')
  );
};

const readTrackChannelKind = (
  item: Record<string, unknown>
): HomeFeedRowData['channelKind'] | undefined => {
  const channel = item.channel;
  if (!isObjectLike(channel) || typeof channel.medium_id !== 'number') {
    return undefined;
  }
  const kind = subscriptionChannelKindFromMediumId(channel.medium_id);
  return kind === 'albums' || kind === 'artists' ? kind : undefined;
};

export const normalizeItemRows = (
  items: unknown[],
  kind: NormalizeItemRowsKind
): HomeFeedRowData[] => {
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

    if (kind === 'track') {
      const subtitle =
        readStringFromNestedRecord(item, 'channel', 'title') ?? readFlatItemSubtitle(item);
      const channelId = readStringFromNestedRecord(item, 'channel', 'id_text');
      const channelKind = readTrackChannelKind(item);
      const row: HomeFeedRowData = {
        id,
        imageUrl: readImageUrl(item),
        subtitle,
        title,
      };
      if (channelId !== null) {
        row.channelId = channelId;
      }
      if (channelKind !== undefined) {
        row.channelKind = channelKind;
      }
      rows.push(row);
      continue;
    }

    const subtitle =
      readStringFromNestedRecord(item, 'channel', 'title') ?? readFlatItemSubtitle(item);
    const updatedAt = readUpdatedAt(item.pub_date);
    const duration = readStringFromNestedRecord(item, 'item_about', 'duration');
    const descriptionSource = readStringFromNestedRecord(item, 'item_description', 'value');
    const description = descriptionSource !== null ? htmlToPlainTextPreview(descriptionSource) : '';

    const row: HomeFeedRowData = {
      id,
      imageUrl: readImageUrl(item),
      subtitle,
      title,
    };
    if (updatedAt !== null) {
      row.updatedAt = updatedAt;
    }
    if (duration !== null) {
      row.duration = duration;
    }
    if (description.length > 0) {
      row.description = description;
    }

    rows.push(row);
  }

  return rows;
};

/**
 * Directory and Home clip lists mix any podcast and any episode, so each row names both.
 * Payloads are nested `DTOClip` objects; flat title fields are not part of that contract.
 */
export const normalizeClipRows = (items: unknown[]): HomeFeedRowData[] => {
  const rows: HomeFeedRowData[] = [];

  for (const item of items) {
    const source = clipHomeRowSourceFromUnknown(item);
    if (source === null) {
      continue;
    }
    rows.push(clipToHomeRow(source, MIXED_SOURCE_CLIP_ROW_OPTIONS));
  }

  return rows;
};

export type MapItemToHomeFeedRowOptions = {
  /** Compact music rows: title + album/artist only. */
  compact?: boolean;
};

const channelKindFromItem = (item: DTOItem): HomeFeedRowData['channelKind'] | undefined => {
  const kind = subscriptionChannelKindFromMediumId(item.channel?.medium_id);
  return kind === 'albums' || kind === 'artists' ? kind : undefined;
};

/**
 * Compact track row: title, album/artist overline, and go-to ids. Date, duration, and description
 * stay off so Home / Browse / in-channel music lists stay dense.
 */
export const mapTrackToHomeFeedRow = (item: DTOItem): HomeFeedRowData => {
  const channelId = item.channel?.id_text?.trim() ?? '';
  const channelKind = channelKindFromItem(item);
  const row: HomeFeedRowData = {
    id: item.id_text,
    imageUrl: getItemPrimaryImageUrl(item),
    subtitle: item.channel?.title ?? null,
    title: item.title ?? item.id_text,
  };
  if (channelId.length > 0) {
    row.channelId = channelId;
  }
  if (channelKind !== undefined) {
    row.channelKind = channelKind;
  }
  return row;
};

/**
 * Map a full item to a feed row. Used wherever rows come from typed `DTOItem`s rather than a raw
 * list payload, so a stored episode and a freshly fetched one render identically.
 */
export const mapItemToHomeFeedRow = (
  item: DTOItem,
  options: MapItemToHomeFeedRowOptions = {}
): HomeFeedRowData => {
  if (options.compact === true) {
    return mapTrackToHomeFeedRow(item);
  }

  const plainDescription = htmlToPlainTextPreview(item.item_description?.value);
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

export const mapItemsToHomeFeedRows = (
  items: readonly DTOItem[],
  options: MapItemToHomeFeedRowOptions = {}
): HomeFeedRowData[] => {
  return items
    .map((item) => mapItemToHomeFeedRow(item, options))
    .filter((row) => row.id.length > 0);
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
    isSubscribed: true,
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

const mapSubscribedChannelsBare = (subscribed: readonly SubscribedChannel[]): HomeFeedRowData[] => {
  return subscribed.map((channel) => mapSubscribedChannelToRow(channel, undefined));
};

/**
 * Titles and art come from the follow list. Badges wait on three extra local queries; if those
 * hang, Home still paints the follows and the error log records why the badges are late.
 */
export const attachSubscriptionMetadataOrBare = async (
  subscribed: readonly SubscribedChannel[],
  mediaType: HomeMediaType
): Promise<HomeFeedRowData[]> => {
  try {
    return await withHomeFeedReadBudget(
      attachSubscriptionMetadata(subscribed),
      HOME_FEED_METADATA_TIMEOUT_MS,
      `${mediaType}-metadata`,
      HOME_FEED_METADATA_TIMEOUT_CODE
    );
  } catch (error) {
    appendHomeFeedReadFailure({
      error,
      mediaType,
      source: 'metadata',
    });
    return mapSubscribedChannelsBare(subscribed);
  }
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
    isSubscribed: false,
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
    .map((record) => {
      const row: HomeFeedRowData = {
        id: record.itemIdText,
        imageUrl: record.artworkUrl,
        subtitle: record.channelTitle,
        title: record.title ?? record.itemIdText,
      };
      if (mediaType === 'episodes') {
        row.updatedAt = record.updatedAt;
      }
      return row;
    });
};

export const fetchHomeFeedRows = async (
  mediaType: HomeMediaType,
  options: HomeFeedOptions = {}
): Promise<HomeFeedRowData[]> => {
  const sort = options.sort ?? DEFAULT_HOME_SORT;
  const ensureCurrent = (): void => {
    if (options.isCurrent !== undefined && !options.isCurrent()) {
      throw new HomeFeedStaleReadError();
    }
  };

  if (mediaType === 'podcasts' || mediaType === 'artists' || mediaType === 'albums') {
    // Channel chips read local directory follows only. Kind splits podcasts / artists / albums so a
    // music follow never appears under Podcasts and the reverse. Popularity ranks arrive from the
    // sync queue; this path never waits on the network to paint. Add by RSS feeds live on the Add
    // by RSS library screen.
    const kind =
      mediaType === 'podcasts' ? 'podcasts' : mediaType === 'artists' ? 'artists' : 'albums';
    const subscribed = await subscriptionsRepository.list({
      filter: 'directory',
      kind,
      sort,
    });
    ensureCurrent();
    return attachSubscriptionMetadataOrBare(subscribed, mediaType);
  }

  if (mediaType === 'episodes') {
    // Episodes for subscribed directory channels come from the device. An empty window stays empty
    // until the channel-items job writes rows — Home does not fill the gap over the network.
    const podcastChannels = await subscriptionsRepository.list({
      filter: 'directory',
      kind: 'podcasts',
      sort,
    });
    ensureCurrent();
    const podcastChannelIds = podcastChannels.map((channel) => channel.idText);
    const stored = await channelItemsRepository.listSubscribed({
      channelIdTexts: podcastChannelIds,
      sort,
    });
    ensureCurrent();
    return mapItemsToHomeFeedRows(stored);
  }

  if (mediaType === 'tracks') {
    const musicChannels = await subscriptionsRepository.list({ filter: 'directory', sort });
    ensureCurrent();
    const musicChannelIds = musicChannels
      .filter((channel) => channel.kind === 'artists' || channel.kind === 'albums')
      .map((channel) => channel.idText);
    const stored = await channelItemsRepository.listSubscribed({
      channelIdTexts: musicChannelIds,
      sort,
    });
    ensureCurrent();
    return mapItemsToHomeFeedRows(stored, { compact: true });
  }

  if (mediaType === 'clips') {
    // Account-backed clips land in kv via the home-clips job. Signed-out and pre-sync reads
    // are empty; the screen chooses Login vs Browse from that.
    const stored = await homeClipsCacheRepository.listPayload();
    ensureCurrent();
    return applyHomeSort(normalizeClipRows(stored), sort);
  }

  return [];
};
