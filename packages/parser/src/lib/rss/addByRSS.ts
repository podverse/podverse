import { _requestWithHeaders } from '@parser/lib/_request.js';
import type { FeedObject } from 'podverse-partytime';
import { parseFeed } from 'podverse-partytime';

import { DEFAULT_HTTP_TIMEOUT_MS, resolveParserMaxFeedBodyBytes, sleep } from '@podverse/helpers';
import { canonicalHttpOrHttpsUrl } from '@podverse/helpers-validation';

import type { CredentialsWithheldDecision } from './addByRSSRedirectAuth.js';
import { buildCredentialScopedBeforeRedirect } from './addByRSSRedirectAuth.js';
import { getRawFeedMd5Hash } from './hash/rawFeed.js';

export type AddByRSSConditionalCache = {
  feedHash?: string;
  etag?: string;
  lastModified?: string;
};

export type ParseRSSFeedForAddByRSSOptions = AddByRSSConditionalCache & {
  /**
   * When provided, set Authorization: Basic on the feed request (for private add-by-RSS feeds).
   * The caller decides whether the feed URL itself is in scope; redirects are scoped here.
   */
  basicAuth?: { username: string; password: string };
  /** Permit credentials over plain http (local development and fixtures only). */
  allowInsecureCredentials?: boolean;
  /** Called when a redirect hop left credential scope and Authorization was removed. */
  onCredentialsWithheld?: (decision: CredentialsWithheldDecision) => void;
};

export type ParseRSSFeedForAddByRSSResult =
  | {
      status: 'not_modified';
      cache: AddByRSSConditionalCache;
    }
  | {
      status: 'parsed';
      parsedFeed: FeedObject;
      cache: AddByRSSConditionalCache & { feedHash: string };
    }
  | {
      status: 'failed';
      error: string;
    };

// Handle request delay for specific domains to avoid rate limiting
async function handleRateLimitRequestDelay(url: string) {
  const delayConfig = [
    { regex: /^https?:\/\/(www\.)?wavlake\.com/, delay: DEFAULT_HTTP_TIMEOUT_MS },
  ];

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

  const canonicalUrl = canonicalHttpOrHttpsUrl(url);
  if (canonicalUrl === null) {
    return { status: 'failed', error: `parseRSSFeedForAddByRSS: invalid feed URL: ${url}` };
  }

  await handleRateLimitRequestDelay(canonicalUrl);

  const conditionalHeaders: Record<string, string> = {};
  if (options.etag) {
    conditionalHeaders['If-None-Match'] = options.etag;
  }
  if (options.lastModified) {
    conditionalHeaders['If-Modified-Since'] = options.lastModified;
  }
  const basicAuth = options.basicAuth;
  const credentialsAttached = Boolean(basicAuth?.username && basicAuth.password);
  if (basicAuth && credentialsAttached) {
    const encoded = Buffer.from(`${basicAuth.username}:${basicAuth.password}`, 'utf8').toString(
      'base64'
    );
    conditionalHeaders['Authorization'] = `Basic ${encoded}`;
  }

  const response = await _requestWithHeaders<string>(canonicalUrl, {
    headers: conditionalHeaders,
    validateStatus: (status) => (status >= 200 && status < 300) || status === 304,
    beforeRedirect: buildCredentialScopedBeforeRedirect({
      feedUrl: canonicalUrl,
      credentialsAttached,
      allowInsecure: options.allowInsecureCredentials,
      onCredentialsWithheld: options.onCredentialsWithheld,
    }),
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
    return { status: 'failed', error: `parseRSSFeedForAddByRSS: empty body for ${canonicalUrl}` };
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

  const parsedFeed = parseFeed(rawFeed, {
    allowMissingGuid: true,
    maxFeedBodyBytes: resolveParserMaxFeedBodyBytes(process.env.PARSER_MAX_FEED_BODY_BYTES),
  });
  if (!parsedFeed) {
    return {
      status: 'failed',
      error: `parseRSSFeedForAddByRSS: parsedFeed not found for ${canonicalUrl}`,
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
