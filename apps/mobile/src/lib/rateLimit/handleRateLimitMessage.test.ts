import { describe, expect, it } from 'vitest';

import { getRateLimitRetryAfterMs } from './handleRateLimitMessage';

const httpError = (status: number, data?: Record<string, unknown>) => ({
  response: { status, data },
});

describe('getRateLimitRetryAfterMs', () => {
  it('is null for an error that is not a 429', () => {
    expect(getRateLimitRetryAfterMs(httpError(503, { timeUntilResetMs: 5000 }))).toBeNull();
    expect(getRateLimitRetryAfterMs(new Error('offline'))).toBeNull();
  });

  it('reads the reset time from the 429 body', () => {
    expect(getRateLimitRetryAfterMs(httpError(429, { timeUntilResetMs: 12500 }))).toBe(12500);
  });

  it('falls back to retry_after_seconds, then minutesRemaining, then one minute', () => {
    expect(getRateLimitRetryAfterMs(httpError(429, { retry_after_seconds: 30 }))).toBe(30000);
    expect(getRateLimitRetryAfterMs(httpError(429, { minutesRemaining: 2 }))).toBe(120000);
    expect(getRateLimitRetryAfterMs(httpError(429, {}))).toBe(60000);
    expect(getRateLimitRetryAfterMs(httpError(429))).toBe(60000);
  });

  it('never answers below one second', () => {
    expect(getRateLimitRetryAfterMs(httpError(429, { timeUntilResetMs: 0 }))).toBe(1000);
  });
});
