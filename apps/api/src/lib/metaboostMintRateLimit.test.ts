import { describe, expect, it, vi } from 'vitest';

import {
  buildMetaboostMintRateLimit429Body,
  METABOOST_MINT_WINDOW_MS,
  peekMetaboostMintRateLimit,
  tryConsumeMetaboostMintRateLimit,
} from './metaboostMintRateLimit.js';

describe('metaboostMintRateLimit', () => {
  it('blocks repeated consume attempts within the window', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const accountId = 9001;
    expect(tryConsumeMetaboostMintRateLimit(accountId)).toEqual({
      allowed: true,
      retryAfterMs: 0,
      timeUntilResetMs: 0,
    });

    const blocked = tryConsumeMetaboostMintRateLimit(accountId);
    expect(blocked.allowed).toBe(false);
    expect(blocked.retryAfterMs).toBe(METABOOST_MINT_WINDOW_MS);
    expect(blocked.timeUntilResetMs).toBe(METABOOST_MINT_WINDOW_MS);

    vi.useRealTimers();
  });

  it('allows consume again once the window has passed', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-01-01T00:00:00.000Z'));

    const accountId = 9002;
    expect(tryConsumeMetaboostMintRateLimit(accountId).allowed).toBe(true);
    expect(peekMetaboostMintRateLimit(accountId).allowed).toBe(false);

    vi.advanceTimersByTime(METABOOST_MINT_WINDOW_MS + 1);

    expect(peekMetaboostMintRateLimit(accountId).allowed).toBe(true);
    expect(tryConsumeMetaboostMintRateLimit(accountId).allowed).toBe(true);

    vi.useRealTimers();
  });

  it('builds consistent 429 body fields with minute floor', () => {
    expect(
      buildMetaboostMintRateLimit429Body({
        allowed: false,
        retryAfterMs: 1,
        timeUntilResetMs: 1,
      })
    ).toEqual({
      tooManyRequests: true,
      timeUntilResetMs: 1,
      minutesRemaining: 1,
    });

    expect(
      buildMetaboostMintRateLimit429Body({
        allowed: false,
        retryAfterMs: 120001,
        timeUntilResetMs: 120001,
      })
    ).toEqual({
      tooManyRequests: true,
      timeUntilResetMs: 120001,
      minutesRemaining: 3,
    });
  });
});
