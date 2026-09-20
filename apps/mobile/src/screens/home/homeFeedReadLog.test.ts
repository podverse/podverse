import { afterEach, describe, expect, it, vi } from 'vitest';

import {
  HOME_FEED_READ_FAILED_CODE,
  HOME_FEED_READ_LOG_KIND,
  HOME_FEED_READ_TIMEOUT_CODE,
  HomeFeedReadTimeoutError,
  toHomeFeedReadLogAppend,
  withHomeFeedReadBudget,
} from './homeFeedReadLog';

describe('toHomeFeedReadLogAppend', () => {
  it('writes a timeout as home-feed-read with the timeout code', () => {
    const entry = toHomeFeedReadLogAppend({
      error: new HomeFeedReadTimeoutError(8000, 'initial-podcasts'),
      mediaType: 'podcasts',
      source: 'initial',
    });

    expect(entry.jobKind).toBe(HOME_FEED_READ_LOG_KIND);
    expect(entry.outcome).toBe('failure');
    expect(entry.errorCode).toBe(HOME_FEED_READ_TIMEOUT_CODE);
    expect(entry.message).toContain('initial podcasts');
    expect(entry.message).toContain('8000ms');
  });

  it('uses a generic failed code for an unexpected throw', () => {
    const entry = toHomeFeedReadLogAppend({
      error: new Error('sqlite locked'),
      mediaType: 'episodes',
      source: 'synced',
    });

    expect(entry.errorCode).toBe(HOME_FEED_READ_FAILED_CODE);
    expect(entry.message).toContain('sqlite locked');
  });
});

describe('withHomeFeedReadBudget', () => {
  afterEach(() => {
    vi.useRealTimers();
  });

  it('resolves when the work finishes inside the budget', async () => {
    await expect(withHomeFeedReadBudget(Promise.resolve(4), 1000, 'fast')).resolves.toBe(4);
  });

  it('rejects with HomeFeedReadTimeoutError when the work never settles', async () => {
    vi.useFakeTimers();
    const hung = new Promise<number>(() => undefined);
    const pending = withHomeFeedReadBudget(hung, 50, 'hung');

    const expectation = expect(pending).rejects.toMatchObject({
      code: HOME_FEED_READ_TIMEOUT_CODE,
      name: 'HomeFeedReadTimeoutError',
    });
    await vi.advanceTimersByTimeAsync(50);
    await expectation;
  });
});
