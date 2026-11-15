import { describe, expect, it, vi } from 'vitest';

import type { AddByRssMatchFeedInput } from '../lib/addByRss/directoryMatch';
import type { SignedInAddByRssRefreshDeps } from './addByRssSignedInRefresh';
import { runSignedInAddByRssRefresh } from './addByRssSignedInRefresh';

const HOUR_MS = 60 * 60 * 1000;
const FEED_A = 'https://example.com/a.xml';
const FEED_B = 'https://example.com/b.xml';

const feedInput = (feedUrl: string): AddByRssMatchFeedInput => ({
  feedUrl,
  items: [],
  podcastGuid: 'guid-1',
});

const run = (
  overrides: Partial<SignedInAddByRssRefreshDeps> = {}
): ReturnType<typeof runSignedInAddByRssRefresh> => {
  return runSignedInAddByRssRefresh({
    convertAccountFeed: async () => undefined,
    findMatches: async (feeds) =>
      new Map(feeds.map((feed) => [feed.feedUrl, { feedUrl: feed.feedUrl }])),
    force: false,
    lastDirectoryMatchAtMs: null,
    listMatchFeeds: async () => [feedInput(FEED_A)],
    logFailure: () => undefined,
    matchRequestAnswered: () => false,
    membershipAllowsRefresh: () => true,
    nowMs: 10_000,
    requestRefreshAll: async () => undefined,
    ...overrides,
  });
};

describe('runSignedInAddByRssRefresh', () => {
  it('converts a matching feed before the membership check, then refreshes', async () => {
    const order: string[] = [];
    await run({
      convertAccountFeed: async () => {
        order.push('convert');
      },
      membershipAllowsRefresh: () => {
        order.push('membership');
        return true;
      },
      requestRefreshAll: async () => {
        order.push('refresh');
      },
    });
    expect(order).toEqual(['convert', 'membership', 'refresh']);
  });

  it('refreshes after a conversion failure, including the next matching feed', async () => {
    const order: string[] = [];
    const logFailure = vi.fn();
    await run({
      convertAccountFeed: async (feed) => {
        order.push(`convert:${feed.feedUrl}`);
        if (feed.feedUrl === FEED_A) {
          throw new Error('convert failed');
        }
      },
      listMatchFeeds: async () => [feedInput(FEED_A), feedInput(FEED_B)],
      logFailure,
      membershipAllowsRefresh: () => {
        order.push('membership');
        return true;
      },
      requestRefreshAll: async () => {
        order.push('refresh');
      },
    });
    expect(order).toEqual([`convert:${FEED_A}`, `convert:${FEED_B}`, 'membership', 'refresh']);
    expect(logFailure).toHaveBeenCalledTimes(1);
    expect(logFailure.mock.calls[0]?.[0]).toBe('promotion');
  });

  it('converts when a membership does not allow the parse refresh', async () => {
    const order: string[] = [];
    await run({
      convertAccountFeed: async () => {
        order.push('convert');
      },
      membershipAllowsRefresh: () => {
        order.push('membership');
        return false;
      },
      requestRefreshAll: async () => {
        order.push('refresh');
      },
    });
    expect(order).toEqual(['convert', 'membership']);
  });

  it('skips the match inside the hour unless this run is a pull-to-refresh', async () => {
    const convertAccountFeed = vi.fn(async () => undefined);
    const requestRefreshAll = vi.fn(async () => undefined);
    const insideHour = await run({
      convertAccountFeed,
      force: false,
      lastDirectoryMatchAtMs: 1_000,
      nowMs: 1_000 + HOUR_MS - 1,
      requestRefreshAll,
    });
    expect(convertAccountFeed).not.toHaveBeenCalled();
    expect(requestRefreshAll).toHaveBeenCalledTimes(1);
    expect(insideHour.lastDirectoryMatchAtMs).toBe(1_000);

    await run({
      convertAccountFeed,
      force: true,
      lastDirectoryMatchAtMs: 1_000,
      nowMs: 1_000 + HOUR_MS - 1,
      requestRefreshAll,
    });
    expect(convertAccountFeed).toHaveBeenCalledTimes(1);
  });

  it('still refreshes when the match request fails, and remembers an answered failure', async () => {
    const requestRefreshAll = vi.fn(async () => undefined);
    const answered = new Error('answered');
    const answeredRun = await run({
      findMatches: async () => {
        throw answered;
      },
      matchRequestAnswered: (error) => error === answered,
      nowMs: 5_000,
      requestRefreshAll,
    });
    expect(requestRefreshAll).toHaveBeenCalledTimes(1);
    expect(answeredRun.lastDirectoryMatchAtMs).toBe(5_000);

    const missed = await run({
      findMatches: async () => {
        throw new Error('network');
      },
      lastDirectoryMatchAtMs: null,
      matchRequestAnswered: () => false,
      nowMs: 6_000,
      requestRefreshAll,
    });
    expect(requestRefreshAll).toHaveBeenCalledTimes(2);
    expect(missed.lastDirectoryMatchAtMs).toBeNull();
  });
});
