import { createHash } from 'node:crypto';

import csv from 'csv-parser';
import fs from 'fs';
import path from 'path';

import type {
  EpisodeByGuidResponse,
  EpisodeByGuidSecondaryParams,
  PodcastBatchByFeedGuidResponse,
  PodcastByGuidResponse,
  PodcastIndexSearchPodcastsResponse,
  PodcastsByTagResponse,
} from '@podverse/helpers';
import {
  computeExponentialBackoffDelayMs,
  DEFAULT_HTTP_TIMEOUT_MS,
  sleep,
} from '@podverse/helpers';
import { type ILoggerLike, summarizeUpstreamHttpErrorForLog } from '@podverse/helpers-backend';
import { type AxiosRequestConfig, requestWithUserAgent } from '@podverse/helpers-requests';
import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import { shouldRetryPodcastIndexRequest } from './isRetryablePodcastIndexError.js';
import {
  PODCAST_INDEX_DEFAULT_MAX_RETRIES,
  PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS,
  type PodcastIndexClientOptions,
} from './podcastIndexClientOptions.js';
import { RECENT_GET_DATA_MAX_FETCH_MS } from './recentGetDataLimits.js';
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
};

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

    for (let attempt = 0; attempt < maxAttempts; attempt++) {
      try {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        const response = await requestWithUserAgent<any>(
          url,
          {
            headers: this.buildAuthHeaders(),
            ...config,
          },
          this.userAgent,
          extraParams?.abort
        );

        return response?.data;
      } catch (error: unknown) {
        lastError = error;
        const summary = summarizeUpstreamHttpErrorForLog(error, { requestUrl: url });
        const canRetry =
          attempt < maxAttempts - 1 &&
          shouldRetryPodcastIndexRequest(error, {
            clientAbortRequested: extraParams?.abort !== undefined,
          });

        if (canRetry) {
          const delayMs = computeExponentialBackoffDelayMs(attempt, this.retryBaseDelayMs);
          this.loggerService.warn(
            `[PodcastIndex] Request failed (attempt ${attempt + 1}/${maxAttempts}), retrying in ${delayMs}ms: ${JSON.stringify(summary)}`
          );
          await sleep(delayMs);
          continue;
        }

        this.loggerService.logError(`[PodcastIndex] Request failed: ${JSON.stringify(summary)}`);
        throw error;
      }
    }

    throw lastError;
  };

  // Dead Feeds

  deadFeedsDownloadAndExtractCSV = async (
    resolveHandler: (row: string[]) => void
  ): Promise<void> => {
    const url = 'https://public.podcastindex.org/podcastindex_dead_feeds.csv';
    const tmpDir = path.join(__dirname, 'tmp');
    const filePath = path.join(tmpDir, 'podcastindex_dead_feeds.csv');

    if (!fs.existsSync(tmpDir)) {
      fs.mkdirSync(tmpDir);
    }

    const data = await this.podcastIndexAPIRequest(url, { responseType: 'stream' });

    const writer = fs.createWriteStream(filePath);
    data.pipe(writer);

    await new Promise<void>((resolve, reject) => {
      writer.on('finish', () => resolve());
      writer.on('error', reject);
    });

    await new Promise<void>((resolve, reject) => {
      const stream = fs.createReadStream(filePath).pipe(csv({ headers: false, skipLines: 0 }));

      stream.on('data', async (row: string[]) => {
        stream.pause();
        try {
          await resolveHandler(row);
          stream.resume();
        } catch (err) {
          stream.destroy(err instanceof Error ? err : new Error(String(err)));
        }
      });
      stream.on('end', () => resolve());
      stream.on('error', reject);
      stream.on('close', () => resolve());
    });

    fs.unlinkSync(filePath);
  };

  deadFeedsExtractRow = (row: string[]) => {
    const id_to_archive = row[0] ?? '';
    const duplicate_id_to_keep = row[1] ?? null;
    return {
      id_to_archive: parseInt(id_to_archive, 10),
      duplicate_id_to_keep: duplicate_id_to_keep ? parseInt(duplicate_id_to_keep, 10) : null,
    };
  };

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
        const response = await this.podcastIndexAPIRequest(url);
        const normalizedFeed = this.normalizePodcastFeed(response?.feed);
        if (normalizedFeed !== null) {
          return normalizedFeed;
        }
      } catch {
        // assume a 404 / not found; fallback to the next scheme variant.
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

  recentGetData = async (sinceRange: number) => {
    this.loggerService.info('recentGetData beginning...');
    const currentTimeInSeconds = Math.floor(Date.now() / 1000);
    const sinceTimeInSeconds = currentTimeInSeconds - sinceRange;
    const paginationStartedAtMs = Date.now();

    /* eslint-disable @typescript-eslint/no-explicit-any -- PI /recent/data feed shape is untyped */
    const fetchData = async (
      since: number,
      allData: any[] = [],
      isFirstPage = true
    ): Promise<any[]> => {
      const elapsedMs = Date.now() - paginationStartedAtMs;
      if (elapsedMs > RECENT_GET_DATA_MAX_FETCH_MS) {
        this.loggerService.warn(
          `[recentGetData] Stopping pagination after ${elapsedMs}ms (cap ${RECENT_GET_DATA_MAX_FETCH_MS}ms). Returning ${allData.length} feeds collected so far.`
        );
        return allData;
      }

      this.loggerService.info(`fetchData since: ${since}, allData.length: ${allData.length}`);
      const url = `${this.baseUrl}/recent/data?max=5000&since=${since}`;
      const abortController = new AbortController();
      const response = await this.podcastIndexAPIRequest(url, undefined, {
        ...this.paginatedRequestExtraParams(isFirstPage),
        abort: {
          controller: abortController,
          timeoutMs: DEFAULT_HTTP_TIMEOUT_MS,
        },
      });
      const updatedFeeds = response.data.feeds;
      const nextSince = response.nextSince;

      allData = allData.concat(updatedFeeds);

      if (nextSince && nextSince <= currentTimeInSeconds) {
        if (nextSince <= since) {
          this.loggerService.info(
            `nextSince (${nextSince}) is not greater than since (${since}). Exiting to avoid infinite loop.`
          );
          return allData;
        }
        const timeLeft = currentTimeInSeconds - nextSince;
        this.loggerService.info(`Time remaining: ${timeLeft} seconds`);
        return fetchData(nextSince, allData, false);
      }

      return allData;
    };
    /* eslint-enable @typescript-eslint/no-explicit-any */

    return fetchData(sinceTimeInSeconds);
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

export { iterateFeedsFromDb, type FeedRow } from './publicFeedsDb.js';
export { isRetryablePodcastIndexError } from './isRetryablePodcastIndexError.js';
export {
  PODCAST_INDEX_DEFAULT_MAX_RETRIES,
  PODCAST_INDEX_DEFAULT_RETRY_BASE_DELAY_MS,
  parsePodcastIndexClientOptionsFromEnv,
  type PodcastIndexClientOptions,
} from './podcastIndexClientOptions.js';
