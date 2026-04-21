import { describe, expect, it } from 'vitest';

import { buildRateLimit429Body, deriveRateLimitResetTimeMs } from './rateLimitPayload.js';

describe('rateLimiter helpers', () => {
  it('derives reset time from express metadata when present', () => {
    const nowMs = 1_700_000_000_000;
    const resetTime = new Date(nowMs + 30_000);
    expect(deriveRateLimitResetTimeMs(resetTime, 60_000, nowMs)).toBe(resetTime.getTime());
  });

  it('falls back to now + window when reset metadata is missing', () => {
    const nowMs = 1_700_000_000_000;
    expect(deriveRateLimitResetTimeMs(undefined, 60_000, nowMs)).toBe(nowMs + 60_000);
  });

  it('builds 429 body with minute floor and expected contract fields', () => {
    expect(buildRateLimit429Body(1)).toEqual({
      tooManyRequests: true,
      timeUntilResetMs: 1,
      minutesRemaining: 1,
    });

    expect(buildRateLimit429Body(61_000)).toEqual({
      tooManyRequests: true,
      timeUntilResetMs: 61_000,
      minutesRemaining: 2,
    });
  });
});
