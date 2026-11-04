import { createHash } from 'node:crypto';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

import fs from 'fs';
import os from 'os';
import path from 'path';

import type {
  EpisodeByGuidResponse,
  EpisodeByGuidSecondaryParams,
  PodcastBatchByFeedGuidResponse,
  PodcastByGuidResponse,
  PodcastIndexSearchPodcastsResponse,
  PodcastsByTagResponse,
} from '@podverse/helpers';
import { computeExponentialBackoffDelayMs, sleep } from '@podverse/helpers';
import { type ILoggerLike, summarizeUpstreamHttpErrorForLog } from '@podverse/helpers-backend';
import type { AxiosRequestConfig } from '@podverse/helpers-requests';
import { requestWithHeadersWithUserAgent, requestWithUserAgent } from '@podverse/helpers-requests';
import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import type { DeadFeedCsvRow } from './deadFeedDuplicateChains.js';
import { extractDeadFeedCsvRow, forEachDeadFeedCsvRow } from './deadFeedDuplicateChains.js';
import {
  isPodcastIndexClientAbortError,
  shouldRetryPodcastIndexRequest,
} from './isRetryablePodcastIndexError.js';
import type { PodcastIndexNewestEpisode } from './newestEpisodesByFeedId.js';
import {
  parseNewestEpisodesResponse,
  PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS,
} from './newestEpisodesByFeedId.js';
import {
  PODCAST_INDEX_DEFAULT_MAX_RETRIES,
  PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS,
  type PodcastIndexClientOptions,
} from './podcastIndexClientOptions.js';
import type { RecentDataPage, RecentGetDataStopReason } from './recentDataPage.js';
import { parseRecentDataPage } from './recentDataPage.js';
import {
  PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS,
  RECENT_GET_DATA_MAX_FETCH_MS,
} from './recentGetDataLimits.js';
import {
  type PodcastIndexSearchByTermOptions,
  podcastIndexSearchByTermPath,
} from './searchByTermQuery.js';

export type PodcastIndexAPIRequestExtraParams = {
  delayMs?: number;
  abort?: {
    controller: AbortController;
    timeoutMs: number;
  };
  retryDeadlineAbort?: boolean;
  /**
   * HTTP statuses the caller treats as a normal miss (e.g. byfeedurl 400/404).
   * Rethrown without `logError`; other failures still log.
   */
  expectedMissStatuses?: readonly number[];
};

export function httpStatusFromUpstreamError(error: unknown): number | null {
  if (typeof error !== 'object' || error === null) {
    return null;
  }
  if (!('response' in error)) {
    return null;
  }
  const response = error.response;
  if (typeof response !== 'object' || response === null || !('status' in response)) {
    return null;
  }
  const status = response.status;
  return typeof status === 'number' && Number.isFinite(status) ? status : null;
}

function isExpectedMissStatus(
  error: unknown,
  expectedMissStatuses: readonly number[] | undefined
): boolean {
  if (expectedMissStatuses === undefined || expectedMissStatuses.length === 0) {
    return false;
  }
  const status = httpStatusFromUpstreamError(error);
  return status !== null && expectedMissStatuses.includes(status);
}

export type DeadFeedCsvDownloadResult =
  { notModified: true } | { notModified: false; lastModified: string | null; etag: string | null };

function destroyResponseBody(data: unknown): void {
  if (typeof data !== 'object' || data === null) {
    return;
  }
  const destroy = Reflect.get(data, 'destroy');
  if (typeof destroy === 'function') {
    destroy.call(data);
  }
}

function responseBodyStream(data: unknown): Readable {
  if (data instanceof Readable) {
    return data;
  }
  throw new Error('Dead-feed CSV response was not a stream');
}

function responseHeader(headers: unknown, name: string): string | null {
  if (typeof headers !== 'object' || headers === null) {
    return null;
  }
  const raw = Reflect.get(headers, name);
  if (typeof raw === 'string' && raw.trim() !== '') {
    return raw;
  }
  if (Array.isArray(raw)) {
    const first = raw[0];
    if (typeof first === 'string' && first.trim() !== '') {
      return first;
    }
  }
  const get = Reflect.get(headers, 'get');
  if (typeof get !== 'function') {
    return null;
  }
  const fromGet = Reflect.apply(get, headers, [name]);
  if (typeof fromGet === 'string' && fromGet.trim() !== '') {
    return fromGet;
  }
  return null;
}

type Constructor = {
  userAgent: string;
  authKey: string;
  baseUrl: string;
  secretKey: string;
  loggerService: ILoggerLike;
} & PodcastIndexClientOptions;

/*
  NOTE!!!
  The episodeGuid needs to be encoded both on the client-side and server side if it is an http url guid.
  Koa will automatically decode the encoded url param, and then Podcast Index API needs it
  encoded once again before sending the request to PI API.
*/

export class PodcastIndexService {
  declare userAgent: string;
  declare authKey: string;
  declare baseUrl: string;
  declare secretKey: string;
  declare loggerService: ILoggerLike;
  declare maxRetries: number;
  declare retryBaseDelayMs: number;
  declare rateLimitDelay: number;

  constructor({
    userAgent,
    authKey,
    baseUrl,
    secretKey,
    loggerService,
    maxRetries = PODCAST_INDEX_DEFAULT_MAX_RETRIES,
    retryBaseDelayMs = PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS,
    rateLimitDelay = 0,
  }: Constructor) {
    this.userAgent = userAgent;
    this.authKey = authKey;
    this.baseUrl = baseUrl;
    this.secretKey = secretKey;
    this.loggerService = loggerService;
    this.maxRetries = maxRetries;
    this.retryBaseDelayMs = retryBaseDelayMs;
    this.rateLimitDelay = rateLimitDelay;
  }

  private buildAuthHeaders(): {
    'X-Auth-Key': string;
    'X-Auth-Date': number;
    Authorization: string;
  } {
    const apiHeaderTime = Math.floor(Date.now() / 1000);
    const hash = createHash('sha1')
      .update(this.authKey + this.secretKey + apiHeaderTime)
      .digest('hex');

    return {
      'X-Auth-Key': this.authKey,
      'X-Auth-Date': apiHeaderTime,
      Authorization: hash,
    };
  }

  /**
   * Short pause before successive paginated Podcast Index requests (`PODCAST_INDEX_API_RATE_LIMIT_DELAY`).
   * Not used for retry backoff after failures (see `retryBaseDelayMs`).
   */
  private paginatedRequestExtraParams(isFirstPage: boolean): { delayMs: number } | undefined {
    if (isFirstPage || this.rateLimitDelay <= 0) {
      return undefined;
    }
    return { delayMs: this.rateLimitDelay };
  }

  // Request handler

  podcastIndexAPIRequest = async (
    url: string,
    config?: AxiosRequestConfig,
    extraParams?: PodcastIndexAPIRequestExtraParams
  ) => {
    if (extraParams?.delayMs && extraParams.delayMs > 0) {
      await sleep(extraParams.delayMs);
    }

    const maxAttempts = this.maxRetries + 1;
    let lastError: unknown;
    const timeoutMs = extraParams?.abort?.timeoutMs;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      const abortForAttempt =
        timeoutMs !== undefined
          ? { controller: new AbortController(), timeoutMs }
          : extraParams?.abort;

      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await requestWithUserAgent<any>(
          url,
          {
            headers: this.buildAuthHeaders(),
            ...config,
          },
          this.userAgent,
          abortForAttempt
        );

        return response?.data;
      } catch (error: unknown) {
        lastError = error;
        const summary = summarizeUpstreamHttpErrorForLog(error, { requestUrl: url });
        const isDeadlineAbortRetry =
          extraParams?.retryDeadlineAbort === true && isPodcastIndexClientAbortError(error);
        const canRetry =
          attempt < maxAttempts - 1 &&
          shouldRetryPodcastIndexRequest(error, {
            clientAbortRequested:
              extraParams?.abort !== undefined && extraParams?.retryDeadlineAbort !== true,
            retryDeadlineAbort: extraParams?.retryDeadlineAbort,
          });

        if (canRetry) {
          const delayMs = computeExponentialBackoffDelayMs(attempt, this.retryBaseDelayMs);
          if (!isDeadlineAbortRetry) {
            this.loggerService.warn(
              `[PodcastIndex] Request failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delayMs}ms: ${JSON.stringify(summary)}`
            );
          }
          await sleep(delayMs);
          continue;
        }

        if (!isExpectedMissStatus(error, extraParams?.expectedMissStatuses)) {
          this.loggerService.logError(`[PodcastIndex] Request failed: ${JSON.stringify(summary)}`);
        }
        throw error;
      }
    }

    throw lastError;
  };

  // Dead Feeds

  deadFeedsDownloadAndExtractCSV = async (
    resolveHandler: (row: string[]) => void | Promise<void>,
    conditional?: { ifModifiedSince?: string | null; ifNoneMatch?: string | null }
  ): Promise<DeadFeedCsvDownloadResult> => {
    const url = 'https://public.podcastindex.org/podcastindex_dead_feeds.csv';
    const headers: Record<string, string> = {};
    if (conditional?.ifModifiedSince) {
      headers['If-Modified-Since'] = conditional.ifModifiedSince;
    }
    if (conditional?.ifNoneMatch) {
      headers['If-None-Match'] = conditional.ifNoneMatch;
    }

    const maxAttempts = this.maxRetries + 1;
    let lastError: unknown;

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        const response = await requestWithHeadersWithUserAgent<unknown>(
          url,
          {
            headers,
            responseType: 'stream',
            validateStatus: (status: number) => status === 200 || status === 304,
          },
          this.userAgent
        );

        if (response.status === 304) {
          destroyResponseBody(response.data);
          return { notModified: true };
        }

        const tmpDir = await fs.promises.mkdtemp(path.join(os.tmpdir(), 'pi-dead-feeds-'));
        const filePath = path.join(tmpDir, 'podcastindex_dead_feeds.csv');
        try {
          await pipeline(responseBodyStream(response.data), fs.createWriteStream(filePath));
          await forEachDeadFeedCsvRow(fs.createReadStream(filePath), resolveHandler);
          return {
            notModified: false,
            lastModified: responseHeader(response.headers, 'last-modified'),
            etag: responseHeader(response.headers, 'etag'),
          };
        } finally {
          await fs.promises.rm(tmpDir, { recursive: true, force: true });
        }
      } catch (error: unknown) {
        lastError = error;
        const canRetry =
          attempt < maxAttempts - 1 &&
          shouldRetryPodcastIndexRequest(error, { clientAbortRequested: false });
        if (!canRetry) {
          throw error;
        }
        const delayMs = computeExponentialBackoffDelayMs(attempt, this.retryBaseDelayMs);
        this.loggerService.warn(
          `[PodcastIndex] Dead-feed CSV download failed; retrying in ${delayMs}ms`
        );
        await sleep(delayMs);
      }
    }

    throw lastError instanceof Error ? lastError : new Error('Dead-feed CSV download failed');
  };

  deadFeedsExtractRow = (row: string[]): DeadFeedCsvRow | null => extractDeadFeedCsvRow(row);

  // Podcast

  // Test podcast_index_id range (only active in non-production)
  private readonly TEST_PODCAST_INDEX_ID_MIN = 2147483640;

  private deriveHttpsAndHttpUrlsFromInput(inputUrl: string): {
    httpsUrl: string;
    httpUrl: string;
  } | null {
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

  private normalizePodcastFeed(
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    feed: any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): any | null {
    if (!feed || typeof feed !== 'object') {
      return null;
    }

    const rawId = feed.id;
    const idNumber = typeof rawId === 'number' ? rawId : Number.parseInt(String(rawId), 10);
    const normalizedId = Number.isFinite(idNumber) ? idNumber : null;

    return {
      ...feed,
      feedId: normalizedId,
      podcast_index_id: normalizedId,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  private getMockTestFeed(podcast_index_id: number): any | null {
    // Only return mock data in non-production environments
    if (process.env.NODE_ENV === 'production') {
      return null;
    }

    // Determine which test feed based on podcast_index_id
    let channelTitle: string;
    let medium: string;
    let feedUrl: string;

    if (podcast_index_id === 2147483640) {
      // Feed 1 - Podcast
      channelTitle = 'Lighthouse Test Podcast';
      medium = 'podcast';
      feedUrl = 'http://localhost:3000/test-assets/feed-1.rss';
    } else if (podcast_index_id === 2147483641) {
      // Feed 2 - Video
      channelTitle = 'Lighthouse Test Video';
      medium = 'video';
      feedUrl = 'http://localhost:3000/test-assets/feed-2.rss';
    } else if (podcast_index_id === 2147483642) {
      // Feed 3 - Music
      channelTitle = 'Lighthouse Test Music';
      medium = 'music';
      feedUrl = 'http://localhost:3000/test-assets/feed-3.rss';
    } else {
      return null;
    }

    // Return mock Podcast Index API response structure
    return {
      status: 'true',
      query: {
        id: podcast_index_id.toString(),
      },
      feed: {
        id: podcast_index_id,
        podcastGuid: `test-guid-${podcast_index_id}`,
        title: channelTitle,
        url: feedUrl,
        originalUrl: feedUrl,
        link: feedUrl,
        description: `Test feed for Lighthouse performance testing (${channelTitle})`,
        author: 'Podverse',
        ownerName: 'Podverse',
        image: `http://localhost:3000/test-assets/chan-${podcast_index_id - 2147483639}-image.jpg`,
        artwork: `http://localhost:3000/test-assets/chan-${podcast_index_id - 2147483639}-image.jpg`,
        lastUpdateTime: Math.floor(Date.now() / 1000),
        lastCrawlTime: Math.floor(Date.now() / 1000),
        lastParseTime: Math.floor(Date.now() / 1000),
        lastGoodHttpStatusTime: Math.floor(Date.now() / 1000),
        lastHttpStatus: 200,
        contentType: 'application/rss+xml',
        itunesId: null,
        itunesType: 'episodic',
        generator: 'Podverse Test',
        language: 'en',
        explicit: false,
        type: 0,
        medium: medium,
        dead: 0,
        chash: '',
        episodeCount: 1,
        crawlErrors: 0,
        parseErrors: 0,
        categories: {},
        locked: 0,
        imageUrlHash: 0,
      },
      description: `Mock Podcast Index API response for test feed ${podcast_index_id}`,
    };
  }

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  podcastGetById = async (podcast_index_id: number): Promise<any | null> => {
    // Check if this is a test podcast_index_id (only in non-production)
    if (
      process.env.NODE_ENV !== 'production' &&
      podcast_index_id >= this.TEST_PODCAST_INDEX_ID_MIN
    ) {
      const mockFeed = this.getMockTestFeed(podcast_index_id);
      if (mockFeed) {
        this.loggerService.info(
          `[PodcastIndex] Returning mock data for test podcast_index_id: ${podcast_index_id}`
        );
        return mockFeed;
      }
    }

    const url = `${this.baseUrl}/podcasts/byfeedid?id=${podcast_index_id}`;
    try {
      const response = await this.podcastIndexAPIRequest(url);
      return response || null;
    } catch {
      return null;
    }
  };

  podcastGetByGuid = async (
    podcastGuid: string,
    delayMs?: number
  ): Promise<PodcastByGuidResponse | null> => {
    // Check if this is a test feed URL (only in non-production)
    if (process.env.NODE_ENV !== 'production') {
      if (podcastGuid.includes('/test-assets/lighthouse/feed-1.rss')) {
        return this.getMockTestFeed(2147483640) as PodcastByGuidResponse | null;
      } else if (podcastGuid.includes('/test-assets/lighthouse/feed-2.rss')) {
        return this.getMockTestFeed(2147483641) as PodcastByGuidResponse | null;
      } else if (podcastGuid.includes('/test-assets/lighthouse/feed-3.rss')) {
        return this.getMockTestFeed(2147483642) as PodcastByGuidResponse | null;
      }
    }

    const url = `${this.baseUrl}/podcasts/byguid?guid=${podcastGuid}`;
    let podcastIndexPodcast: PodcastByGuidResponse | null = null;

    try {
      const data = await this.podcastIndexAPIRequest(
        url,
        undefined,
        delayMs !== undefined ? { delayMs } : undefined
      );
      podcastIndexPodcast = data;
    } catch {
      // assume a 404
    }

    return podcastIndexPodcast || null;
  };

  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  podcastGetByFeedUrl = async (feedUrl: string): Promise<any | null> => {
    const urlVariants = this.deriveHttpsAndHttpUrlsFromInput(feedUrl);
    if (urlVariants === null) {
      return null;
    }

    const lookupUrls = [urlVariants.httpsUrl, urlVariants.httpUrl];
    for (const lookupUrl of lookupUrls) {
      const url = `${this.baseUrl}/podcasts/byfeedurl?url=${encodeURIComponent(lookupUrl)}`;
      try {
        const response = await this.podcastIndexAPIRequest(url, undefined, {
          // Podcast Index returns 400 (and sometimes 404) when the URL is unknown.
          expectedMissStatuses: [400, 404],
        });
        const normalizedFeed = this.normalizePodcastFeed(response?.feed);
        if (normalizedFeed !== null) {
          return normalizedFeed;
        }
      } catch {
        // assume a miss; fallback to the next scheme variant.
      }
    }

    return null;
  };

  podcastsByMedium = async (medium: string, max: number = 100) => {
    const safeMax = Math.min(max, 1000);
    const url = `${this.baseUrl}/podcasts/bymedium?medium=${encodeURIComponent(medium)}&max=${safeMax}`;
    const response = await this.podcastIndexAPIRequest(url);
    return response.feeds || [];
  };

  podcastsBatchByFeedGuid = async (
    feedGuids: string[]
  ): Promise<PodcastBatchByFeedGuidResponse> => {
    const url = `${this.baseUrl}/podcasts/batch/byguid`;
    const response = await this.podcastIndexAPIRequest(url, {
      method: 'POST',
      data: feedGuids,
    });
    return response;
  };

  // Recent

  /**
   * Pages `/recent/data` forward from `since` (Unix seconds), yielding each page before the next
   * request so the caller can finish and record it first. Stops once `nextSince` passes the time
   * the run started or stops advancing (`caught_up`), or when `RECENT_GET_DATA_MAX_FETCH_MS` has
   * elapsed before the next request (`time_cap`). A deadline abort after retries also returns
   * `time_cap`; other failures throw.
   */
  async *recentGetData(since: number): AsyncGenerator<RecentDataPage, RecentGetDataStopReason> {
    const startedAtMs = Date.now();
    const startedAtSeconds = Math.floor(startedAtMs / 1000);
    let pageSince = since;
    let isFirstPage = true;

    while (true) {
      const elapsedMs = Date.now() - startedAtMs;
      if (elapsedMs > RECENT_GET_DATA_MAX_FETCH_MS) {
        this.loggerService.warn(
          `[recentGetData] Stopping pagination after ${elapsedMs}ms (cap ${RECENT_GET_DATA_MAX_FETCH_MS}ms) before since=${pageSince}.`
        );
        return 'time_cap';
      }

      const url = `${this.baseUrl}/recent/data?max=5000&since=${pageSince}`;
      let response: unknown;
      try {
        response = await this.podcastIndexAPIRequest(url, undefined, {
          ...this.paginatedRequestExtraParams(isFirstPage),
          abort: {
            controller: new AbortController(),
            timeoutMs: PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS,
          },
          retryDeadlineAbort: true,
        });
      } catch (error: unknown) {
        if (isPodcastIndexClientAbortError(error)) {
          this.loggerService.warn(
            `[recentGetData] Timed out after retries for since=${pageSince}; stopping and resuming next run from the last completed page.`
          );
          return 'time_cap';
        }
        throw error;
      }
      isFirstPage = false;

      const page = parseRecentDataPage(response, pageSince);
      if (page === null) {
        this.loggerService.warn(
          `[recentGetData] Response for since=${pageSince} has no data.feeds array; stopping.`
        );
        return 'caught_up';
      }

      this.loggerService.info(
        `[recentGetData] since=${pageSince} feeds=${page.feeds.length} nextSince=${page.nextSince ?? 'none'}`
      );
      yield page;

      const { nextSince } = page;
      if (nextSince === null || nextSince <= pageSince || nextSince > startedAtSeconds) {
        return 'caught_up';
      }
      pageSince = nextSince;
    }
  }

  /**
   * The newest episode Podcast Index lists for each of up to
   * `PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS` feeds. Feeds with no episode there are absent from
   * the result. Pass `isFirstRequest: false` on later requests of a run so they wait
   * `PODCAST_INDEX_API_RATE_LIMIT_DELAY` first. A failed request or an unreadable body throws.
   */
  episodesGetNewestByFeedIds = async (
    podcastIndexIds: readonly number[],
    isFirstRequest = true
  ): Promise<PodcastIndexNewestEpisode[]> => {
    if (podcastIndexIds.length === 0) {
      return [];
    }
    if (podcastIndexIds.length > PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS) {
      throw new Error(
        `[PodcastIndex] episodesGetNewestByFeedIds takes at most ${PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS} ids; got ${podcastIndexIds.length}`
      );
    }

    // `max` is set so the response is never cut below one episode per requested feed.
    const url =
      `${this.baseUrl}/episodes/byfeedid?id=${podcastIndexIds.join(',')}` +
      `&newest&max=${podcastIndexIds.length}`;
    const response: unknown = await this.podcastIndexAPIRequest(url, undefined, {
      ...this.paginatedRequestExtraParams(isFirstRequest),
      abort: {
        controller: new AbortController(),
        timeoutMs: PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS,
      },
      retryDeadlineAbort: true,
    });

    const episodes = parseNewestEpisodesResponse(response);
    if (episodes === null) {
      throw new Error('[PodcastIndex] /episodes/byfeedid returned a body that is not an object');
    }
    return episodes;
  };

  // Search

  searchPodcasts = async (
    term: string,
    options: PodcastIndexSearchByTermOptions = {}
  ): Promise<PodcastIndexSearchPodcastsResponse | null> => {
    return this.searchByTerm('/search/byterm', term, options, 'searchPodcasts');
  };

  searchMusicByTerm = async (
    term: string,
    options: PodcastIndexSearchByTermOptions = {}
  ): Promise<PodcastIndexSearchPodcastsResponse | null> => {
    return this.searchByTerm('/search/music/byterm', term, options, 'searchMusicByTerm');
  };

  private searchByTerm = async (
    searchPath: '/search/byterm' | '/search/music/byterm',
    term: string,
    options: PodcastIndexSearchByTermOptions,
    logLabel: 'searchPodcasts' | 'searchMusicByTerm'
  ): Promise<PodcastIndexSearchPodcastsResponse | null> => {
    const url = podcastIndexSearchByTermPath(this.baseUrl, searchPath, term, options);

    try {
      const response = await this.podcastIndexAPIRequest(url);
      return response || [];
    } catch (error: unknown) {
      const summary = summarizeUpstreamHttpErrorForLog(error, { requestUrl: url });
      this.loggerService.logError(
        `[PodcastIndex] ${logLabel} failed: ${JSON.stringify({
          ...summary,
          searchTermCharCount: term.length,
        })}`
      );
      return null;
    }
  };

  // Trending

  trendingGetPodcasts = async (
    max: number = 25,
    since?: number,
    lang?: string,
    cat?: string
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
  ): Promise<{ feeds: any[]; nextSince?: number }> => {
    const safeMax = Math.min(max, 1000);
    let url = `${this.baseUrl}/podcasts/trending?max=${safeMax}`;
    if (since) {
      url += `&since=${since}`;
    }
    if (lang) {
      url += `&lang=${encodeURIComponent(lang)}`;
    }
    if (cat) {
      url += `&cat=${encodeURIComponent(cat)}`;
    }

    this.loggerService.info(
      `[PodcastIndex] Fetching trending feeds (max: ${safeMax}, since: ${since}, lang: ${lang}, cat: ${cat})`
    );
    const response = await this.podcastIndexAPIRequest(url);

    return {
      feeds: response.feeds || [],
      nextSince: response.nextSince,
    };
  };

  // Episodes

  episodeGetByGuid = async (
    guid: string,
    secondaryGuid: EpisodeByGuidSecondaryParams
  ): Promise<EpisodeByGuidResponse | null> => {
    let url = `${this.baseUrl}/episodes/byguid?guid=${guid}`;

    if (secondaryGuid) {
      const feedid = secondaryGuid.feedid;
      const podcastguid = secondaryGuid.podcastguid;
      const feedurl = secondaryGuid.feedurl;

      if (!feedid && !podcastguid && !feedurl) {
        this.loggerService.logError(
          '[PodcastIndex] episodeGetByGuid called with invalid secondaryGuid',
          { secondaryGuid }
        );
        return null;
      }

      if (feedid) {
        url += `&feedid=${feedid}`;
      } else if (podcastguid) {
        url += `&podcastguid=${podcastguid}`;
      } else if (feedurl) {
        url += `&feedurl=${feedurl}`;
      }
    }

    try {
      const data = await this.podcastIndexAPIRequest(url);
      return data as EpisodeByGuidResponse;
    } catch (error: unknown) {
      const summary = summarizeUpstreamHttpErrorForLog(error, { requestUrl: url });
      this.loggerService.logError(
        `[PodcastIndex] episodeGetByGuid failed: ${JSON.stringify(summary)}`
      );
      return null;
    }
  };

  // Value

  valueGetByPodcastIds = async (): Promise<number[]> => {
    const accumulatedPodcastIndexIds: number[] = [];
    const nextStartAt = 1;
    const podcast_index_ids = await this.valueGetByPodcastIdsRecursively(
      accumulatedPodcastIndexIds,
      nextStartAt
    );

    return podcast_index_ids;
  };

  valueGetByPodcastIdsRecursively = async (
    accumulatedPodcastIndexIds: number[],
    startAt = 1,
    isFirstPage = true
  ): Promise<number[]> => {
    const url = `${this.baseUrl}/podcasts/bytag?podcast-valueTimeSplit=true&max=5000&start_at=${startAt}`;
    const data = (await this.podcastIndexAPIRequest(
      url,
      undefined,
      this.paginatedRequestExtraParams(isFirstPage)
    )) as PodcastsByTagResponse;

    for (const feed of data.feeds) {
      accumulatedPodcastIndexIds.push(feed.id);
    }

    if (data.nextStartAt) {
      return await this.valueGetByPodcastIdsRecursively(
        accumulatedPodcastIndexIds,
        data.nextStartAt,
        false
      );
    }

    return accumulatedPodcastIndexIds;
  };
}

export {
  deadFeedPairsWeHold,
  deadFeedTargetMap,
  extractDeadFeedCsvRow,
  forEachDeadFeedCsvRow,
  podcastIndexIdsToRetire,
  resolveDeadFeedDuplicateChains,
  RETIRE_BRAKE_MIN_GROWTH,
  RETIRE_MAX_PER_RUN,
  retireGrowthExceedsBrake,
} from './deadFeedDuplicateChains.js';
export type { DeadFeedCsvRow, DeadFeedDuplicatePair } from './deadFeedDuplicateChains.js';
export { iterateFeedsFromDb, type FeedRow } from './publicFeedsDb.js';
export {
  isPodcastIndexClientAbortError,
  isRetryablePodcastIndexError,
} from './isRetryablePodcastIndexError.js';
export {
  PODCAST_INDEX_DEFAULT_MAX_RETRIES,
  PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS,
  parsePodcastIndexClientOptionsFromEnv,
  type PodcastIndexClientOptions,
} from './podcastIndexClientOptions.js';
export * from './podcastIndexProvider.js';
export type { PodcastIndexNewestEpisode } from './newestEpisodesByFeedId.js';
export { PODCAST_INDEX_EPISODES_BY_FEED_ID_MAX_IDS } from './newestEpisodesByFeedId.js';
export type { RecentDataFeed, RecentDataPage, RecentGetDataStopReason } from './recentDataPage.js';
export {
  PODCAST_INDEX_PAGE_REQUEST_TIMEOUT_MS,
  PODCAST_INDEX_GAP_SWEEP_MAX_RUN_MS,
  PODCAST_INDEX_RECENT_DATA_MAX_LOOKBACK_SECONDS,
  RECENT_DATA_CURSOR_OVERLAP_SECONDS,
  RECENT_GET_DATA_MAX_FETCH_MS,
} from './recentGetDataLimits.js';
