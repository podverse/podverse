import { _requestWithHeaders } from '@parser/lib/_request.js';
import type { FeedObject } from 'podverse-partytime';
import { parseFeed } from 'podverse-partytime';

import { sleep } from '@podverse/helpers';

import { getRawFeedMd5Hash } from './hash/rawFeed.js';

export type ParseRSSFeedForAddByRSSOptions = {
  feedHash?: string;
  etag?: string;
  lastModified?: string;
  /** When provided, set Authorization: Basic on the feed request (for private add-by-RSS feeds). */
  basicAuth?: { username: string; password: string };
};

export type ParseRSSFeedForAddByRSSResult =
  | {
      status: 'not_modified';
      cache: ParseRSSFeedForAddByRSSOptions;
    }
  | {
      status: 'parsed';
      parsedFeed: FeedObject;
      cache: ParseRSSFeedForAddByRSSOptions & { feedHash: string };
    }
  | {
      status: 'failed';
      error: string;
    };

// Handle request delay for specific domains to avoid rate limiting
async function handleRateLimitRequestDelay(url: string) {
  const delayConfig = [{ regex: /^https?:\/\/(www\.)?wavlake\.com/, delay: 5000 }];

  for (const { regex, delay } of delayConfig) {
    if (regex.test(url)) {
      await sleep(delay);
      break;
    }
  }
}

type HeaderValue = string | string[] | undefined;
type HeaderRecord = Record<string, HeaderValue>;

const getHeaderValue = (headers: HeaderRecord, headerName: string): string | undefined => {
  const value = headers[headerName];
  if (typeof value === 'string') {
    return value;
  }
  if (Array.isArray(value)) {
    const first = value[0];
    return typeof first === 'string' ? first : undefined;
  }
  return undefined;
};

export const parseRSSFeedForAddByRSS = async (
  url: string,
  options: ParseRSSFeedForAddByRSSOptions = {}
): Promise<ParseRSSFeedForAddByRSSResult> => {
  if (!url) {
    return { status: 'failed', error: 'parseRSSFeedForAddByRSS: url is required' };
  }

  await handleRateLimitRequestDelay(url);

  const conditionalHeaders: Record<string, string> = {};
  if (options.etag) {
    conditionalHeaders['If-None-Match'] = options.etag;
  }
  if (options.lastModified) {
    conditionalHeaders['If-Modified-Since'] = options.lastModified;
  }
  if (
    options.basicAuth?.username !== undefined &&
    options.basicAuth?.username !== null &&
    options.basicAuth?.password !== undefined &&
    options.basicAuth?.password !== null
  ) {
    const encoded = Buffer.from(
      `${options.basicAuth.username}:${options.basicAuth.password}`,
      'utf8'
    ).toString('base64');
    conditionalHeaders['Authorization'] = `Basic ${encoded}`;
  }

  const response = await _requestWithHeaders<string>(url, {
    headers: conditionalHeaders,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
  });

  if (response.status === 304) {
    return {
      status: 'not_modified',
      cache: {
        feedHash: options.feedHash,
        etag: options.etag,
        lastModified: options.lastModified,
      },
    };
  }

  const rawFeed = typeof response.data === 'string' ? response.data : String(response.data);
  if (!rawFeed) {
    return { status: 'failed', error: `parseRSSFeedForAddByRSS: empty body for ${url}` };
  }

  const responseHeaders = response.headers as HeaderRecord;
  const responseEtag = getHeaderValue(responseHeaders, 'etag');
  const responseLastModified = getHeaderValue(responseHeaders, 'last-modified');
  const currentFeedHash = getRawFeedMd5Hash(rawFeed);

  if (options.feedHash && options.feedHash === currentFeedHash) {
    return {
      status: 'not_modified',
      cache: {
        feedHash: currentFeedHash,
        etag: responseEtag,
        lastModified: responseLastModified,
      },
    };
  }

  const parsedFeed = parseFeed(rawFeed, { allowMissingGuid: true });
  if (!parsedFeed) {
    return {
      status: 'failed',
      error: `parseRSSFeedForAddByRSS: parsedFeed not found for ${url}`,
    };
  }

  return {
    status: 'parsed',
    parsedFeed,
    cache: {
      feedHash: currentFeedHash,
      etag: responseEtag,
      lastModified: responseLastModified,
    },
  };
};
