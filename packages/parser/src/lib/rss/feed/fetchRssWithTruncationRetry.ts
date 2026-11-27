import {
  rssBodyLooksCutOff,
  TRUNCATION_FETCH_ATTEMPTS,
  TRUNCATION_FETCH_DELAYS_MS,
} from '@podverse/helpers';

import { FeedResponseTruncatedError } from '../errors.js';
import { classifyFeedParseFailure } from './classifyFeedParseFailure.js';

type FetchRssBodyParams = {
  url: string;
  maxFeedBodyBytes: number;
  request: (url: string, maxFeedBodyBytes: number) => Promise<string>;
  sleep: (ms: number) => Promise<void>;
  onRetry?: (attempt: number, delayMs: number) => void;
};

/** Downloads a feed body, retrying only when the download ends early. */
export async function fetchRssBodyWithTruncationRetry(params: FetchRssBodyParams): Promise<string> {
  let lastError: unknown;

  for (let attempt = 1; attempt <= TRUNCATION_FETCH_ATTEMPTS; attempt += 1) {
    try {
      const body = await params.request(params.url, params.maxFeedBodyBytes);
      if (rssBodyLooksCutOff(body)) {
        throw new FeedResponseTruncatedError(params.url);
      }
      return body;
    } catch (error) {
      lastError = error;
      if (
        classifyFeedParseFailure(error) !== 'response_truncated' ||
        attempt >= TRUNCATION_FETCH_ATTEMPTS
      ) {
        throw error;
      }
      const delayMs = TRUNCATION_FETCH_DELAYS_MS[attempt - 1] ?? 0;
      params.onRetry?.(attempt, delayMs);
      await params.sleep(delayMs);
    }
  }

  throw lastError instanceof Error ? lastError : new Error('Feed download failed');
}
