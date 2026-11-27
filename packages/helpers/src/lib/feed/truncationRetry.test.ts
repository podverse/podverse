import { describe, expect, it } from 'vitest';

import { FIFTEEN_MINUTES_MS, ONE_DAY_MS, ONE_HOUR_MS } from '../timeConstants.js';
import {
  allowlistFeedCountsAsStored,
  automaticParseBypassesTruncationWait,
  RSS_CUT_OFF_MIN_BYTES,
  rssBodyLooksCutOff,
  truncationBackoffRemainingMs,
  truncationWaitMs,
} from './truncationRetry.js';

const NOW = new Date('2026-11-26T12:00:00.000Z');

describe('automaticParseBypassesTruncationWait', () => {
  it('skips the wait for a forced reparse and a signed-in refresh', () => {
    expect(
      automaticParseBypassesTruncationWait({ forceParse: true, onDemandAccountId: null })
    ).toBe(true);
    expect(automaticParseBypassesTruncationWait({ forceParse: false, onDemandAccountId: 4 })).toBe(
      true
    );
    expect(
      automaticParseBypassesTruncationWait({ forceParse: false, onDemandAccountId: null })
    ).toBe(false);
  });
});

describe('truncationWaitMs', () => {
  it('waits 15 minutes, 1 hour, 6 hours, then 1 day', () => {
    expect(truncationWaitMs(0)).toBe(FIFTEEN_MINUTES_MS);
    expect(truncationWaitMs(1)).toBe(FIFTEEN_MINUTES_MS);
    expect(truncationWaitMs(2)).toBe(ONE_HOUR_MS);
    expect(truncationWaitMs(3)).toBe(6 * ONE_HOUR_MS);
    expect(truncationWaitMs(4)).toBe(ONE_DAY_MS);
    expect(truncationWaitMs(9)).toBe(ONE_DAY_MS);
  });
});

describe('truncationBackoffRemainingMs', () => {
  it('returns the remainder of the wait for a cut-off download', () => {
    const lastFailedAt = new Date(NOW.getTime() - 5 * 60 * 1000);
    expect(
      truncationBackoffRemainingMs({
        reason: 'response_truncated',
        lastFailedAt,
        consecutiveFailures: 1,
        now: NOW,
      })
    ).toBe(FIFTEEN_MINUTES_MS - 5 * 60 * 1000);
  });

  it('returns 0 once the wait has elapsed', () => {
    const lastFailedAt = new Date(NOW.getTime() - ONE_HOUR_MS);
    expect(
      truncationBackoffRemainingMs({
        reason: 'response_truncated',
        lastFailedAt,
        consecutiveFailures: 1,
        now: NOW,
      })
    ).toBe(0);
  });

  it('returns 0 for a finished reason and for any other failure', () => {
    expect(
      truncationBackoffRemainingMs({
        reason: null,
        lastFailedAt: NOW,
        consecutiveFailures: 4,
        now: NOW,
      })
    ).toBe(0);
    expect(
      truncationBackoffRemainingMs({
        reason: 'timeout',
        lastFailedAt: NOW,
        consecutiveFailures: 4,
        now: NOW,
      })
    ).toBe(0);
  });
});

describe('rssBodyLooksCutOff', () => {
  it('is true for a large body with no closing feed tag', () => {
    const body = `<rss><channel><title>${'x'.repeat(RSS_CUT_OFF_MIN_BYTES)}</title>`;
    expect(rssBodyLooksCutOff(body)).toBe(true);
  });

  it('is false for a short body and for a document that closed', () => {
    expect(rssBodyLooksCutOff('<html><body>nope</body></html>')).toBe(false);
    const closed = `<rss><channel></channel></rss>${' '.repeat(RSS_CUT_OFF_MIN_BYTES)}`;
    expect(rssBodyLooksCutOff(closed)).toBe(false);
    const atom = `<feed></feed>${' '.repeat(RSS_CUT_OFF_MIN_BYTES)}`;
    expect(rssBodyLooksCutOff(atom)).toBe(false);
  });
});

describe('allowlistFeedCountsAsStored', () => {
  it('keeps a finished parse stored', () => {
    expect(
      allowlistFeedCountsAsStored(
        {
          lastFinishedParseTime: NOW,
          lastFailedAt: NOW,
          reason: 'response_truncated',
          consecutiveTruncationFailures: 4,
        },
        NOW
      )
    ).toBe(true);
  });

  it('keeps a cut-off feed stored while its wait remains, and releases it after', () => {
    const waiting = {
      lastFinishedParseTime: null,
      lastFailedAt: NOW,
      reason: 'response_truncated' as const,
      consecutiveTruncationFailures: 4,
    };
    expect(allowlistFeedCountsAsStored(waiting, NOW)).toBe(true);
    expect(allowlistFeedCountsAsStored(waiting, new Date(NOW.getTime() + ONE_DAY_MS))).toBe(false);
  });

  it('releases a never-finished feed whose failure is not a cut-off download', () => {
    expect(
      allowlistFeedCountsAsStored(
        {
          lastFinishedParseTime: null,
          lastFailedAt: NOW,
          reason: 'timeout',
          consecutiveTruncationFailures: 0,
        },
        NOW
      )
    ).toBe(false);
  });
});
