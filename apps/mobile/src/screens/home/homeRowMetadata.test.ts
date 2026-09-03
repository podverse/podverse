import { describe, expect, it } from 'vitest';

import type { HomeRowMetadataSources } from './homeRowMetadata';
import { buildHomeRowMetadata } from './homeRowMetadata';

const emptySources = (overrides: Partial<HomeRowMetadataSources> = {}): HomeRowMetadataSources => ({
  broadcastingKeys: new Set<string>(),
  downloadedCountByChannel: new Map<string, number>(),
  unseen: [],
  ...overrides,
});

describe('buildHomeRowMetadata', () => {
  it('joins every source onto the subscription that owns it', () => {
    const metadata = buildHomeRowMetadata(
      [
        { idText: 'channel-a', latestItemPubDateMs: 1700 },
        { idText: 'https://example.com/feed.xml', latestItemPubDateMs: 1600 },
      ],
      emptySources({
        broadcastingKeys: new Set(['channel-a']),
        downloadedCountByChannel: new Map([['channel-a', 3]]),
        unseen: [
          { hasMoreUnseen: false, subscriptionKey: 'channel-a', unseenCount: 4 },
          { hasMoreUnseen: false, subscriptionKey: 'https://example.com/feed.xml', unseenCount: 0 },
        ],
      })
    );

    expect(metadata.get('channel-a')).toEqual({
      downloadedCount: 3,
      isLive: true,
      latestItemPubDateMs: 1700,
      unseenBadge: { count: 4, isCapped: false },
    });
    expect(metadata.get('https://example.com/feed.xml')).toEqual({
      downloadedCount: 0,
      isLive: false,
      latestItemPubDateMs: 1600,
      unseenBadge: null,
    });
  });

  it('treats a subscription missing from every source as quietly empty rather than as a gap', () => {
    const metadata = buildHomeRowMetadata(
      [{ idText: 'new-follow', latestItemPubDateMs: null }],
      emptySources()
    );

    expect(metadata.get('new-follow')).toEqual({
      downloadedCount: 0,
      isLive: false,
      latestItemPubDateMs: null,
      unseenBadge: null,
    });
  });

  it('caps the unseen badge and marks it as capped only past the cap', () => {
    const metadata = buildHomeRowMetadata(
      [
        { idText: 'at-cap', latestItemPubDateMs: null },
        { idText: 'over-cap', latestItemPubDateMs: null },
      ],
      emptySources({
        unseen: [
          { hasMoreUnseen: false, subscriptionKey: 'at-cap', unseenCount: 20 },
          { hasMoreUnseen: true, subscriptionKey: 'over-cap', unseenCount: 20 },
        ],
      })
    );

    expect(metadata.get('at-cap')?.unseenBadge).toEqual({ count: 20, isCapped: false });
    expect(metadata.get('over-cap')?.unseenBadge).toEqual({ count: 20, isCapped: true });
  });

  it('ignores source entries for subscriptions that are no longer in the list', () => {
    const metadata = buildHomeRowMetadata(
      [{ idText: 'kept', latestItemPubDateMs: null }],
      emptySources({
        broadcastingKeys: new Set(['unfollowed']),
        downloadedCountByChannel: new Map([['unfollowed', 9]]),
        unseen: [{ hasMoreUnseen: false, subscriptionKey: 'unfollowed', unseenCount: 5 }],
      })
    );

    expect([...metadata.keys()]).toEqual(['kept']);
  });
});
