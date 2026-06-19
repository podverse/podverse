import { describe, expect, it } from 'vitest';

import {
  isPodcastIndexClientAbortError,
  isRetryablePodcastIndexError,
  shouldRetryPodcastIndexRequest,
} from './isRetryablePodcastIndexError.js';

describe('isRetryablePodcastIndexError', () => {
  it('returns true for HTTP 5xx responses', () => {
    expect(isRetryablePodcastIndexError({ response: { status: 500 } })).toBe(true);
    expect(isRetryablePodcastIndexError({ response: { status: 503 } })).toBe(true);
  });

  it('returns true for HTTP 429 responses', () => {
    expect(isRetryablePodcastIndexError({ response: { status: 429 } })).toBe(true);
  });

  it('returns false for non-retryable HTTP 4xx responses', () => {
    expect(isRetryablePodcastIndexError({ response: { status: 400 } })).toBe(false);
    expect(isRetryablePodcastIndexError({ response: { status: 401 } })).toBe(false);
    expect(isRetryablePodcastIndexError({ response: { status: 404 } })).toBe(false);
  });

  it('returns true for transient network error codes', () => {
    expect(isRetryablePodcastIndexError({ code: 'ECONNRESET' })).toBe(true);
    expect(isRetryablePodcastIndexError({ code: 'ETIMEDOUT' })).toBe(true);
    expect(isRetryablePodcastIndexError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isRetryablePodcastIndexError({ code: 'ERR_BAD_RESPONSE' })).toBe(true);
  });

  it('returns false for unknown errors', () => {
    expect(isRetryablePodcastIndexError({ code: 'ENOTFOUND' })).toBe(false);
    expect(isRetryablePodcastIndexError(new Error('boom'))).toBe(false);
  });
});

describe('isPodcastIndexClientAbortError', () => {
  it('returns true for abort and timeout error shapes', () => {
    expect(isPodcastIndexClientAbortError({ name: 'AbortError' })).toBe(true);
    expect(isPodcastIndexClientAbortError({ name: 'CanceledError' })).toBe(true);
    expect(isPodcastIndexClientAbortError({ code: 'ECONNABORTED' })).toBe(true);
    expect(isPodcastIndexClientAbortError({ code: 'ERR_CANCELED' })).toBe(true);
  });

  it('returns false for unrelated errors', () => {
    expect(isPodcastIndexClientAbortError({ code: 'ECONNRESET' })).toBe(false);
    expect(isPodcastIndexClientAbortError({ response: { status: 500 } })).toBe(false);
    expect(isPodcastIndexClientAbortError(null)).toBe(false);
  });
});

describe('shouldRetryPodcastIndexRequest', () => {
  it('does not retry client abort errors when abort was requested', () => {
    expect(
      shouldRetryPodcastIndexRequest({ code: 'ECONNABORTED' }, { clientAbortRequested: true })
    ).toBe(false);
  });

  it('still retries ECONNABORTED when no client abort was requested', () => {
    expect(
      shouldRetryPodcastIndexRequest({ code: 'ECONNABORTED' }, { clientAbortRequested: false })
    ).toBe(true);
  });

  it('retries retryable errors when abort was not requested', () => {
    expect(
      shouldRetryPodcastIndexRequest({ response: { status: 500 } }, { clientAbortRequested: false })
    ).toBe(true);
  });
});
