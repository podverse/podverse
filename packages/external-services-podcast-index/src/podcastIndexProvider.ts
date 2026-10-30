import type {
  IndexProvider,
  IndexProviderFeed,
  IndexProviderFeedRef,
  IndexProviderItem,
  IndexProviderItemRef,
  IndexProviderLookup,
} from '@podverse/helpers';
import {
  chunkArray,
  getOwnPropertyValue,
  hhmmssToSecondsNumber,
  isObjectLike,
  podcastIndexFeedListImageUrl,
  toNonEmptyTrimmedString,
} from '@podverse/helpers';
import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import type { PodcastIndexService } from './index.js';
import { httpStatusFromUpstreamError } from './index.js';

type ProviderRequestResult =
  { status: 'found'; data: unknown } | { status: 'not_found' } | { status: 'unavailable' };

const EXPECTED_MISS_STATUSES = [400, 404];

function normalizeGuid(value: unknown): string | null {
  const trimmed = toNonEmptyTrimmedString(value);
  return trimmed === null ? null : trimmed.toLowerCase();
}

function toPositiveFiniteNumericString(value: unknown): string | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return String(value);
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return String(parsed);
}

function toPositiveFiniteNumber(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const parsed = Number(trimmed);
  if (!Number.isFinite(parsed) || parsed <= 0) {
    return null;
  }
  return parsed;
}

function toDateFromUnixSeconds(value: unknown): Date | null {
  const unixSeconds = toPositiveFiniteNumber(value);
  if (unixSeconds === null) {
    return null;
  }
  const date = new Date(unixSeconds * 1000);
  return Number.isNaN(date.getTime()) ? null : date;
}

function toDurationSeconds(value: unknown): number | null {
  if (typeof value === 'number' && Number.isFinite(value) && value > 0) {
    return value;
  }
  if (typeof value !== 'string') {
    return null;
  }
  const trimmed = value.trim();
  if (trimmed.length === 0) {
    return null;
  }
  const numericSeconds = Number(trimmed);
  if (Number.isFinite(numericSeconds) && numericSeconds > 0) {
    return numericSeconds;
  }
  if (!trimmed.includes(':')) {
    return null;
  }
  const fromClock = hhmmssToSecondsNumber(trimmed);
  return Number.isFinite(fromClock) && fromClock > 0 ? fromClock : null;
}

function toHttpsAndHttpLookupUrls(inputUrl: string): { httpsUrl: string; httpUrl: string } | null {
  const normalized = canonicalHttpOrHttpsUrl(inputUrl);
  if (normalized === null) {
    return null;
  }
  const base = normalized.replace(/^https?:\/\//i, '');
  return {
    httpsUrl: `https://${base}`,
    httpUrl: `http://${base}`,
  };
}

export function toIndexProviderFeed(raw: unknown): IndexProviderFeed | null {
  if (!isObjectLike(raw)) {
    return null;
  }

  const providerFeedId = toPositiveFiniteNumericString(getOwnPropertyValue(raw, 'id'));
  if (providerFeedId === null) {
    return null;
  }

  const feedUrl = canonicalHttpOrHttpsUrl(
    toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'url')) ?? ''
  );
  if (feedUrl === null) {
    return null;
  }

  return {
    indexProvider: 'podcast_index',
    providerFeedId,
    feedGuid: normalizeGuid(getOwnPropertyValue(raw, 'podcastGuid')),
    feedUrl,
    title: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'title')),
    author: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'author')),
    description: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'description')),
    imageUrl: podcastIndexFeedListImageUrl({
      image: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'image')),
      artwork: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'artwork')),
    }),
    medium: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'medium')),
    isDead: getOwnPropertyValue(raw, 'dead') === 1,
  };
}

export function toIndexProviderItem(
  raw: unknown,
  providerFeedId: string
): IndexProviderItem | null {
  if (!isObjectLike(raw)) {
    return null;
  }

  const itemGuid = toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'guid'));
  if (itemGuid === null) {
    return null;
  }

  return {
    indexProvider: 'podcast_index',
    providerFeedId,
    providerItemId: toPositiveFiniteNumericString(getOwnPropertyValue(raw, 'id')),
    itemGuid,
    title: toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'title')),
    imageUrl:
      toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'image')) ??
      toNonEmptyTrimmedString(getOwnPropertyValue(raw, 'feedImage')),
    pubDate: toDateFromUnixSeconds(getOwnPropertyValue(raw, 'datePublished')),
    durationSeconds: toDurationSeconds(getOwnPropertyValue(raw, 'itunes_duration')),
  };
}

export class PodcastIndexProvider implements IndexProvider {
  readonly id = 'podcast_index' as const;

  constructor(private readonly service: PodcastIndexService) {}

  async resolveFeed(ref: IndexProviderFeedRef): Promise<IndexProviderLookup<IndexProviderFeed>> {
    const feedGuid = normalizeGuid(ref.feedGuid);
    if (feedGuid !== null) {
      const byGuidResult = await this.resolveFeedByGuid(feedGuid);
      if (byGuidResult.status === 'found' || byGuidResult.status === 'unavailable') {
        return byGuidResult;
      }
    }

    const feedUrl = toNonEmptyTrimmedString(ref.feedUrl);
    if (feedUrl === null) {
      return { status: 'not_found' };
    }
    return this.resolveFeedByUrl(feedUrl);
  }

  async resolveFeedsByGuid(
    feedGuids: readonly string[]
  ): Promise<IndexProviderLookup<ReadonlyMap<string, IndexProviderFeed>>> {
    const normalizedGuids = Array.from(
      new Set(
        feedGuids
          .map((feedGuid) => normalizeGuid(feedGuid))
          .filter((feedGuid): feedGuid is string => feedGuid !== null)
      )
    );

    if (normalizedGuids.length === 0) {
      return { status: 'found', value: new Map() };
    }

    const feedsByGuid = new Map<string, IndexProviderFeed>();
    for (const feedGuidChunk of chunkArray(normalizedGuids, 100)) {
      const chunkResult = await this.request(`${this.service.baseUrl}/podcasts/batch/byguid`, {
        method: 'POST',
        data: feedGuidChunk,
      });

      if (chunkResult.status !== 'found') {
        return { status: 'unavailable' };
      }

      const rawFeeds = getOwnPropertyValue(chunkResult.data, 'feeds');
      if (!Array.isArray(rawFeeds)) {
        continue;
      }

      for (const rawFeed of rawFeeds) {
        const feed = toIndexProviderFeed(rawFeed);
        if (feed !== null && feed.feedGuid !== null) {
          feedsByGuid.set(feed.feedGuid, feed);
        }
      }
    }

    return { status: 'found', value: feedsByGuid };
  }

  async getFeedById(providerFeedId: string): Promise<IndexProviderLookup<IndexProviderFeed>> {
    const normalizedProviderFeedId = toPositiveFiniteNumericString(providerFeedId);
    if (normalizedProviderFeedId === null) {
      return { status: 'not_found' };
    }

    const result = await this.request(
      `${this.service.baseUrl}/podcasts/byfeedid?id=${encodeURIComponent(normalizedProviderFeedId)}`
    );
    if (result.status !== 'found') {
      return result;
    }

    const feed = toIndexProviderFeed(getOwnPropertyValue(result.data, 'feed'));
    return feed === null ? { status: 'not_found' } : { status: 'found', value: feed };
  }

  async resolveItem(ref: IndexProviderItemRef): Promise<IndexProviderLookup<IndexProviderItem>> {
    const providerFeedId = toPositiveFiniteNumericString(ref.providerFeedId);
    const itemGuid = toNonEmptyTrimmedString(ref.itemGuid);
    if (providerFeedId === null || itemGuid === null) {
      return { status: 'not_found' };
    }

    const result = await this.request(
      `${this.service.baseUrl}/episodes/byguid?guid=${encodeURIComponent(itemGuid)}&feedid=${encodeURIComponent(providerFeedId)}`
    );
    if (result.status !== 'found') {
      return result;
    }

    const item = toIndexProviderItem(getOwnPropertyValue(result.data, 'episode'), providerFeedId);
    return item === null ? { status: 'not_found' } : { status: 'found', value: item };
  }

  private async resolveFeedByGuid(
    feedGuid: string
  ): Promise<IndexProviderLookup<IndexProviderFeed>> {
    const result = await this.request(
      `${this.service.baseUrl}/podcasts/byguid?guid=${encodeURIComponent(feedGuid)}`
    );
    if (result.status !== 'found') {
      return result;
    }

    const feed = toIndexProviderFeed(getOwnPropertyValue(result.data, 'feed'));
    return feed === null ? { status: 'not_found' } : { status: 'found', value: feed };
  }

  private async resolveFeedByUrl(feedUrl: string): Promise<IndexProviderLookup<IndexProviderFeed>> {
    const urls = toHttpsAndHttpLookupUrls(feedUrl);
    if (urls === null) {
      return { status: 'not_found' };
    }

    for (const lookupUrl of [urls.httpsUrl, urls.httpUrl]) {
      const result = await this.request(
        `${this.service.baseUrl}/podcasts/byfeedurl?url=${encodeURIComponent(lookupUrl)}`
      );
      if (result.status === 'unavailable') {
        return result;
      }
      if (result.status === 'found') {
        const feed = toIndexProviderFeed(getOwnPropertyValue(result.data, 'feed'));
        if (feed !== null) {
          return { status: 'found', value: feed };
        }
      }
    }

    return { status: 'not_found' };
  }

  private async request(url: string, config?: AxiosRequestConfig): Promise<ProviderRequestResult> {
    try {
      const data = await this.service.podcastIndexAPIRequest(url, config, {
        expectedMissStatuses: EXPECTED_MISS_STATUSES,
      });
      return { status: 'found', data };
    } catch (error: unknown) {
      const statusCode = httpStatusFromUpstreamError(error);
      if (statusCode === 400 || statusCode === 404) {
        return { status: 'not_found' };
      }
      return { status: 'unavailable' };
    }
  }
}
