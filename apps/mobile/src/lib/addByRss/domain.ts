import type {
  AddByRSSParseCacheEntry,
  AddByRSSPublisherListedFeed,
  AddByRSSResourceData,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { primaryListArtworkUrl, sleep } from '@podverse/helpers';
import { createAddByRSSId, createAddByRSSIdText } from '@podverse/helpers/addByRSS/ids';
import { isObjectLike, toNonEmptyTrimmedString } from '@podverse/helpers/guards';
import { canonicalAddByRSSFeedUrl } from '@podverse/helpers-validation/client';
import type { AddByRSSMappedFeed } from '@podverse/parser-mapping';
import {
  buildAddByRSSResourceData,
  convertParsedRSSFeedToCompat,
  toIndexItem,
  toLiveIndexItem,
} from '@podverse/parser-mapping';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';

export type AddByRssParsePreview = {
  enclosureUrl: string | null;
  imageUrl: string | null;
  /** Newest publish date in the feed, kept as a scalar so recency ordering never re-parses. */
  latestItemPubDateMs: number | null;
  playbackPosition: string | null;
  /**
   * The **channel** title. This becomes `MobileAddByRSSFeedRecord.title`, which Home and My Library
   * render as the name of the feed, so an episode title here would label the channel row with one
   * of its episodes.
   */
  title: string | null;
};

const EMPTY_PREVIEW: AddByRssParsePreview = {
  enclosureUrl: null,
  imageUrl: null,
  latestItemPubDateMs: null,
  playbackPosition: null,
  title: null,
};

type FollowedAddByRssFeed = {
  feed_url: string;
  image_url: string | null;
  requires_credentials?: boolean;
  title: string | null;
};

type ParseStatusPayload = AddByRSSParseCacheEntry<unknown>;

const STATUS_POLL_ATTEMPTS = 4;
const STATUS_POLL_DELAY_MS = 1200;

export const EMPTY_ABRIDGED_INDEX: QueueResourcesAbridgedIndex = {
  add_by_rss_resource_datas: {},
  clips: {},
  items: {},
  item_soundbites: {},
};

export function extractPreviewFromParsePayload(payload: unknown): AddByRssParsePreview {
  if (!isObjectLike(payload)) {
    return { ...EMPTY_PREVIEW };
  }

  const items = payload.items;
  if (!Array.isArray(items)) {
    return { ...EMPTY_PREVIEW };
  }

  const firstItem = items[0];
  if (!isObjectLike(firstItem)) {
    return { ...EMPTY_PREVIEW };
  }

  // Channel title first: the record's title names the feed. The first item is only a fallback for
  // a feed that carries no channel title at all.
  const title = toNonEmptyTrimmedString(payload.title) ?? toNonEmptyTrimmedString(firstItem.title);
  const playbackPosition = toNonEmptyTrimmedString(firstItem.playback_position);

  let enclosureUrl: string | null = null;
  if (isObjectLike(firstItem.enclosure)) {
    enclosureUrl = toNonEmptyTrimmedString(firstItem.enclosure.url);
  }

  let imageUrl: string | null = null;
  if (isObjectLike(firstItem.image)) {
    imageUrl = toNonEmptyTrimmedString(firstItem.image.url);
  }

  return {
    enclosureUrl,
    imageUrl,
    // The raw parse payload is only reached when compat mapping failed. Leaving the date unknown is
    // the honest answer there; the next successful parse fills it in.
    latestItemPubDateMs: null,
    playbackPosition,
    title,
  };
}

/**
 * The newest publish date in a parsed feed, or null when no item carries a usable one.
 *
 * Scans every item rather than trusting `items[0]`: feed order is whatever the publisher wrote, and
 * a feed listing an old episode first would otherwise report itself as stale.
 */
export function getLatestAddByRssItemPubDateMs(mappedFeed: AddByRSSMappedFeed): number | null {
  let latest: number | null = null;

  for (const bundle of mappedFeed.items) {
    const pubDate = bundle.item.pub_date;
    if (pubDate === null || pubDate === undefined) {
      continue;
    }

    const parsed = new Date(pubDate).getTime();
    if (Number.isNaN(parsed)) {
      continue;
    }
    if (latest === null || parsed > latest) {
      latest = parsed;
    }
  }

  return latest;
}

/**
 * Derive the slim feed preview (enclosure/image/title) from the mapped `parser-mapping` bundle so
 * the feed record + playback use the same richly-parsed data as web (not the raw `items[0]`).
 */
export function mapParsedFeedToPreview(mappedFeed: AddByRSSMappedFeed): AddByRssParsePreview {
  const firstItem = mappedFeed.items[0];
  const enclosureUrl = firstItem?.enclosures[0]?.item_enclosure_sources[0]?.uri ?? null;
  const imageUrl = primaryListArtworkUrl(firstItem?.images, mappedFeed.channel.images);
  // Channel title first: the record's title names the feed. The first item is only a fallback for
  // a feed that carries no channel title at all.
  const title = mappedFeed.channel.channel.title ?? firstItem?.item.title ?? null;

  return {
    enclosureUrl,
    imageUrl,
    latestItemPubDateMs: getLatestAddByRssItemPubDateMs(mappedFeed),
    // The compat bundle carries no per-account playback position; it comes from queue/history sync.
    playbackPosition: null,
    title,
  };
}

export type AddByRssPollResult = {
  /** The challenge the feed host answered a `failed` parse with, when the worker recorded one. */
  authChallenge?: ParseStatusPayload['authChallenge'];
  /** Whether the worker sent device-held credentials to the feed host. Never the values. */
  credentialsState?: ParseStatusPayload['credentialsState'];
  /** Machine-readable reason for a `failed` parse, when the worker classified one. */
  failureReason?: ParseStatusPayload['failureReason'];
  /** The feed host's HTTP status on a `failed` parse, when the worker recorded one. */
  httpStatus?: number;
  mappedFeed: AddByRSSMappedFeed | null;
  preview: AddByRssParsePreview;
  /** On a `parsed` artist status: everything the artist lists. Absent means keep what is stored. */
  publisherListedFeeds?: AddByRSSPublisherListedFeed[];
  /**
   * Where the server parse ended up. `pending` means it had not resolved when polling gave up. A
   * `failed` parse is usually the feed host (unreachable, an HTTP error, or XML that is not a feed),
   * and `serverError` carries the reason the server recorded so the error log can show it.
   */
  serverError: string | null;
  status: ParseStatusPayload['status'] | 'pending';
};

function resolveParseResult(
  statusResponse: ParseStatusPayload
): Omit<AddByRssPollResult, 'serverError' | 'status'> {
  const payload = statusResponse.payload;
  if (
    (statusResponse.status === 'parsed' || statusResponse.status === 'not_modified') &&
    payload !== undefined &&
    payload !== null
  ) {
    try {
      const mappedFeed = convertParsedRSSFeedToCompat(
        // The server parse payload is a partytime FeedObject; it arrives typed as `unknown`.
        // Single documented assertion (see avoid-type-assertions rule).
        payload as Parameters<typeof convertParsedRSSFeedToCompat>[0]
      );
      return { mappedFeed, preview: mapParsedFeedToPreview(mappedFeed) };
    } catch {
      // Unexpected payload shape — fall back to slim raw extraction so the add still lands.
      return { mappedFeed: null, preview: extractPreviewFromParsePayload(payload) };
    }
  }

  return { mappedFeed: null, preview: { ...EMPTY_PREVIEW } };
}

export async function pollAddByRssParseStatus(
  requestId: string,
  fetchStatus: (requestId: string) => Promise<ParseStatusPayload>,
  options?: { attempts?: number; delayMs?: number }
): Promise<AddByRssPollResult> {
  const attempts = options?.attempts ?? STATUS_POLL_ATTEMPTS;
  const delayMs = options?.delayMs ?? STATUS_POLL_DELAY_MS;
  for (let index = 0; index < attempts; index += 1) {
    const statusResponse = await fetchStatus(requestId);
    if (
      statusResponse.status === 'parsed' ||
      statusResponse.status === 'not_modified' ||
      statusResponse.status === 'failed'
    ) {
      return {
        ...resolveParseResult(statusResponse),
        authChallenge: statusResponse.authChallenge,
        credentialsState: statusResponse.credentialsState,
        failureReason: statusResponse.failureReason,
        httpStatus: statusResponse.httpStatus,
        ...(statusResponse.publisherListedFeeds !== undefined
          ? { publisherListedFeeds: statusResponse.publisherListedFeeds }
          : {}),
        serverError: toNonEmptyTrimmedString(statusResponse.error),
        status: statusResponse.status,
      };
    }

    if (index < attempts - 1) {
      await sleep(delayMs);
    }
  }

  return { mappedFeed: null, preview: { ...EMPTY_PREVIEW }, serverError: null, status: 'pending' };
}

export function isValidAddByRssFeedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

/**
 * Build playback data for one item in a persisted add-by-RSS bundle.
 *
 * The index item shape is shared with the add-by-RSS queue and playlist mapping, so Home detail
 * episode playback uses the same enclosure and metadata conversion.
 */
export function toAddByRssItemPlaybackResourceData(
  record: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed,
  itemBundle: AddByRSSMappedFeed['items'][number],
  itemIndex: number
): AddByRSSResourceData {
  const feedForIndex = {
    id: record.id,
    idText: record.idText,
    feedUrl: record.feedUrl,
    title: record.title,
    imageUrl: record.imageUrl,
    mappedFeed,
  };

  const indexItem = toIndexItem(feedForIndex, itemBundle, itemIndex, record.idText);
  const mappedResourceData = buildAddByRSSResourceData(indexItem);
  // Canonical so the hash matches every other device, and userinfo never leaves the device.
  const feedUrl = canonicalAddByRSSFeedUrl(record.feedUrl);

  return {
    ...mappedResourceData,
    ...(feedUrl !== null ? { feed_url: feedUrl } : {}),
    playback_position: record.playbackPosition ?? '0',
  };
}

/**
 * Build playback data for one livestream in a persisted add-by-RSS bundle.
 *
 * The index item shape is shared with the add-by-RSS queue and playlist mapping, so livestream
 * playback uses the same enclosure and metadata conversion as an episode.
 */
export function toAddByRssLiveItemPlaybackResourceData(
  record: MobileAddByRSSFeedRecord,
  mappedFeed: AddByRSSMappedFeed,
  liveBundle: AddByRSSMappedFeed['liveItems'][number],
  liveIndex: number
): AddByRSSResourceData {
  const feedForIndex = {
    id: record.id,
    idText: record.idText,
    feedUrl: record.feedUrl,
    title: record.title,
    imageUrl: record.imageUrl,
    mappedFeed,
  };

  const indexItem = toLiveIndexItem(feedForIndex, liveBundle, liveIndex, record.idText);
  const mappedResourceData = buildAddByRSSResourceData(indexItem);
  // Canonical so the hash matches every other device, and userinfo never leaves the device.
  const feedUrl = canonicalAddByRSSFeedUrl(record.feedUrl);

  return {
    ...mappedResourceData,
    ...(feedUrl !== null ? { feed_url: feedUrl } : {}),
    playback_position: record.playbackPosition ?? '0',
  };
}

const addByRssFeedKey = (feedUrl: string): string =>
  canonicalAddByRSSFeedUrl(feedUrl) ?? feedUrl.trim();

export function mergeLocalAndRemoteAddByRssFeeds(
  localFeeds: MobileAddByRSSFeedRecord[],
  remoteFeeds: FollowedAddByRssFeed[]
): MobileAddByRSSFeedRecord[] {
  const localByUrl = new Map<string, MobileAddByRSSFeedRecord>();
  for (const feed of localFeeds) {
    const key = addByRssFeedKey(feed.feedUrl);
    const current = localByUrl.get(key);
    if (current === undefined || feed.feedUrl === key) {
      localByUrl.set(key, feed);
    }
  }
  const remoteUrls = new Set(remoteFeeds.map((remoteFeed) => addByRssFeedKey(remoteFeed.feed_url)));
  const mergedRemote = remoteFeeds.map((remoteFeed) => {
    const feedUrl = addByRssFeedKey(remoteFeed.feed_url);
    const localFeed = localByUrl.get(feedUrl);
    return {
      enclosureUrl: localFeed?.enclosureUrl ?? null,
      feedUrl,
      // A server follow is a follow, including a row held only because an artist lists it.
      followed: true,
      id: localFeed?.id ?? createAddByRSSId(localFeed?.idText ?? createAddByRSSIdText()),
      idText: localFeed?.idText ?? createAddByRSSIdText(),
      imageUrl: remoteFeed.image_url ?? localFeed?.imageUrl ?? null,
      // The last credential failure is what this device saw; the follow list does not carry one.
      lastAuthFailure: localFeed?.lastAuthFailure ?? null,
      // The followed list carries no items, so the date can only come from a parse this device
      // already stored. A feed followed on another device keeps an unknown date until it is parsed.
      latestItemPubDateMs: localFeed?.latestItemPubDateMs ?? null,
      playbackPosition: localFeed?.playbackPosition ?? null,
      // The account's flag is what tells a second device that this feed needs credentials.
      requiresCredentials:
        remoteFeed.requires_credentials ?? localFeed?.requiresCredentials ?? false,
      // The follow list carries no medium, so the type comes from this device's last parse.
      resourceType: localFeed?.resourceType ?? 'podcasts',
      // Follow metadata is written at add time, often as the URL, before parse fills the title.
      // A later list fetch must not replace a parsed local title with that placeholder.
      title: localFeed?.title ?? remoteFeed.title ?? remoteFeed.feed_url,
      updatedAt: new Date().toISOString(),
    };
  });

  // Local listed-only rows are inputs for id reuse, not output. A feed this device follows
  // renders when the account list lags behind it. A path that differs only by a trailing slash
  // is the same feed, so the stored URL is the form without that slash.
  const localOnly: MobileAddByRSSFeedRecord[] = [];
  const localOnlyKeys = new Set<string>();
  for (const feed of localFeeds) {
    const feedUrl = addByRssFeedKey(feed.feedUrl);
    if (feed.followed === false || remoteUrls.has(feedUrl) || localOnlyKeys.has(feedUrl)) {
      continue;
    }
    localOnlyKeys.add(feedUrl);
    localOnly.push(feedUrl === feed.feedUrl ? feed : { ...feed, feedUrl });
  }

  return [...mergedRemote, ...localOnly];
}

/**
 * A local row for a server follow this device does not have yet.
 * Returns null when a row already exists, so a second refresh does not rewrite it.
 */
export function localFeedForServerFollow(
  follow: { feed_url: string; image_url: string | null; title: string | null },
  existing: MobileAddByRSSFeedRecord | null
): MobileAddByRSSFeedRecord | null {
  if (existing !== null) {
    return null;
  }
  const idText = createAddByRSSIdText();
  return {
    enclosureUrl: null,
    feedUrl: follow.feed_url,
    id: createAddByRSSId(idText),
    idText,
    imageUrl: follow.image_url,
    latestItemPubDateMs: null,
    playbackPosition: null,
    // This device has no row yet, so there is no parsed medium to keep.
    resourceType: 'podcasts',
    title: follow.title ?? follow.feed_url,
    updatedAt: new Date().toISOString(),
  };
}

export function buildAddByRssFeedRecord(
  feedUrl: string,
  existingFeed: MobileAddByRSSFeedRecord | undefined,
  preview: AddByRssParsePreview
): MobileAddByRSSFeedRecord {
  const idText = existingFeed?.idText ?? createAddByRSSIdText();
  return {
    enclosureUrl: preview.enclosureUrl ?? existingFeed?.enclosureUrl ?? null,
    feedUrl,
    id: existingFeed?.id ?? createAddByRSSId(idText),
    idText,
    imageUrl: preview.imageUrl ?? existingFeed?.imageUrl ?? null,
    latestItemPubDateMs: preview.latestItemPubDateMs ?? existingFeed?.latestItemPubDateMs ?? null,
    playbackPosition: preview.playbackPosition ?? existingFeed?.playbackPosition ?? null,
    // A preview carries no medium, so the type stays what this device already stored.
    resourceType: existingFeed?.resourceType ?? 'podcasts',
    title: preview.title ?? existingFeed?.title ?? feedUrl,
    updatedAt: new Date().toISOString(),
  };
}
