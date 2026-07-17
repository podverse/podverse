import type {
  AddByRSSParseCacheEntry,
  AddByRSSResourceData,
  QueueResourcesAbridgedIndex,
} from '@podverse/helpers';
import { createAddByRSSId, createAddByRSSIdText } from '@podverse/helpers/addByRSS/ids';

import type { MobileAddByRSSFeedRecord } from '../../prefs/addByRSSFeeds';

type FollowedAddByRssFeed = {
  feed_url: string;
  image_url: string | null;
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

const isRecord = (value: unknown): value is Record<string, unknown> => {
  return typeof value === 'object' && value !== null;
};

const readString = (value: unknown): string | null => {
  return typeof value === 'string' && value.trim() !== '' ? value : null;
};

export function extractPreviewFromParsePayload(payload: unknown): {
  enclosureUrl: string | null;
  imageUrl: string | null;
  playbackPosition: string | null;
  title: string | null;
} {
  if (!isRecord(payload)) {
    return {
      enclosureUrl: null,
      imageUrl: null,
      playbackPosition: null,
      title: null,
    };
  }

  const items = payload.items;
  if (!Array.isArray(items)) {
    return {
      enclosureUrl: null,
      imageUrl: null,
      playbackPosition: null,
      title: null,
    };
  }

  const firstItem = items[0];
  if (!isRecord(firstItem)) {
    return {
      enclosureUrl: null,
      imageUrl: null,
      playbackPosition: null,
      title: null,
    };
  }

  const title = readString(firstItem.title);
  const playbackPosition = readString(firstItem.playback_position);

  let enclosureUrl: string | null = null;
  if (isRecord(firstItem.enclosure)) {
    enclosureUrl = readString(firstItem.enclosure.url);
  }

  let imageUrl: string | null = null;
  if (isRecord(firstItem.image)) {
    imageUrl = readString(firstItem.image.url);
  }

  return {
    enclosureUrl,
    imageUrl,
    playbackPosition,
    title,
  };
}

const delay = async (ms: number): Promise<void> => {
  await new Promise((resolve) => {
    setTimeout(resolve, ms);
  });
};

export async function pollAddByRssParseStatus(
  requestId: string,
  fetchStatus: (requestId: string) => Promise<ParseStatusPayload>
): Promise<{
  enclosureUrl: string | null;
  imageUrl: string | null;
  playbackPosition: string | null;
  title: string | null;
}> {
  for (let index = 0; index < STATUS_POLL_ATTEMPTS; index += 1) {
    const statusResponse = await fetchStatus(requestId);
    if (
      statusResponse.status === 'parsed' ||
      statusResponse.status === 'not_modified' ||
      statusResponse.status === 'failed'
    ) {
      return extractPreviewFromParsePayload(statusResponse.payload);
    }

    await delay(STATUS_POLL_DELAY_MS);
  }

  return {
    enclosureUrl: null,
    imageUrl: null,
    playbackPosition: null,
    title: null,
  };
}

export function isValidAddByRssFeedUrl(value: string): boolean {
  try {
    const parsed = new URL(value);
    return parsed.protocol === 'https:' || parsed.protocol === 'http:';
  } catch {
    return false;
  }
}

export function toAddByRssResourceData(record: MobileAddByRSSFeedRecord): AddByRSSResourceData {
  return {
    enclosure_url: record.enclosureUrl,
    feed_url: record.feedUrl,
    playback_position: record.playbackPosition ?? '0',
    title: record.title ?? record.feedUrl,
  };
}

export function mergeLocalAndRemoteAddByRssFeeds(
  localFeeds: MobileAddByRSSFeedRecord[],
  remoteFeeds: FollowedAddByRssFeed[]
): MobileAddByRSSFeedRecord[] {
  const localByUrl = new Map(localFeeds.map((feed) => [feed.feedUrl, feed]));
  const remoteUrls = new Set(remoteFeeds.map((remoteFeed) => remoteFeed.feed_url));
  const mergedRemote = remoteFeeds.map((remoteFeed) => {
    const localFeed = localByUrl.get(remoteFeed.feed_url);
    return {
      enclosureUrl: localFeed?.enclosureUrl ?? null,
      feedUrl: remoteFeed.feed_url,
      id: localFeed?.id ?? createAddByRSSId(localFeed?.idText ?? createAddByRSSIdText()),
      idText: localFeed?.idText ?? createAddByRSSIdText(),
      imageUrl: remoteFeed.image_url ?? localFeed?.imageUrl ?? null,
      playbackPosition: localFeed?.playbackPosition ?? null,
      resourceType: 'podcasts' as const,
      title: remoteFeed.title ?? localFeed?.title ?? remoteFeed.feed_url,
      updatedAt: new Date().toISOString(),
    };
  });

  // Include locally added feeds not yet reflected in the remote followed list so a
  // just-added feed renders immediately even if the remote list lags.
  const localOnly = localFeeds.filter((feed) => !remoteUrls.has(feed.feedUrl));

  return [...mergedRemote, ...localOnly];
}

export function buildAddByRssFeedRecord(
  feedUrl: string,
  existingFeed: MobileAddByRSSFeedRecord | undefined,
  preview: {
    enclosureUrl: string | null;
    imageUrl: string | null;
    playbackPosition: string | null;
    title: string | null;
  }
): MobileAddByRSSFeedRecord {
  const idText = existingFeed?.idText ?? createAddByRSSIdText();
  return {
    enclosureUrl: preview.enclosureUrl ?? existingFeed?.enclosureUrl ?? null,
    feedUrl,
    id: existingFeed?.id ?? createAddByRSSId(idText),
    idText,
    imageUrl: preview.imageUrl ?? existingFeed?.imageUrl ?? null,
    playbackPosition: preview.playbackPosition ?? existingFeed?.playbackPosition ?? null,
    resourceType: 'podcasts',
    title: preview.title ?? existingFeed?.title ?? feedUrl,
    updatedAt: new Date().toISOString(),
  };
}
