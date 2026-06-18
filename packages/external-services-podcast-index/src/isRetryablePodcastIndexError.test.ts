import { describe, expect, it } from 'vitest';

import { isRetryablePodcastIndexError } from './isRetryablePodcastIndexError.js';

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
    expect(isRetryablePodcastIndexError({ code: 'ERR_BAD_RESPONSE' })).toBe(true);
  });

  it('returns false for unknown errors', () => {
    expect(isRetryablePodcastIndexError({ code: 'ENOTFOUND' })).toBe(false);
    expect(isRetryablePodcastIndexError(new Error('boom'))).toBe(false);
  });
});
