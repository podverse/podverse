import { afterEach, describe, expect, it } from 'vitest';

import {
  beginChannelVisit,
  endChannelVisit,
  engageChannelVisitItem,
  getChannelVisitSnapshot,
  hasActiveChannelVisit,
} from './channelVisitStore';

afterEach(() => {
  endChannelVisit();
});

describe('channelVisitStore', () => {
  it('freezes the previous last-seen for a new visit and keeps engaged ids empty', () => {
    beginChannelVisit({ channelIdText: 'ch-1', kind: 'channel' }, 1_700_000_000_000);

    expect(getChannelVisitSnapshot()).toEqual({
      engagedItemIds: new Set(),
      frozenLastSeenAtMs: 1_700_000_000_000,
      key: { channelIdText: 'ch-1', kind: 'channel' },
    });
  });

  it('keeps the frozen timestamp and engaged ids when the same visit begins again', () => {
    beginChannelVisit({ channelIdText: 'ch-1', kind: 'channel' }, 1_700_000_000_000);
    engageChannelVisitItem('ep-1');
    beginChannelVisit({ channelIdText: 'ch-1', kind: 'channel' }, 9_999_999_999_999);

    const visit = getChannelVisitSnapshot();
    expect(visit?.frozenLastSeenAtMs).toBe(1_700_000_000_000);
    expect(visit?.engagedItemIds.has('ep-1')).toBe(true);
    expect(hasActiveChannelVisit({ channelIdText: 'ch-1', kind: 'channel' })).toBe(true);
  });

  it('replaces the visit when a different channel opens', () => {
    beginChannelVisit({ channelIdText: 'ch-1', kind: 'channel' }, 1);
    engageChannelVisitItem('ep-1');
    beginChannelVisit({ channelIdText: 'ch-2', kind: 'channel' }, 2);

    expect(getChannelVisitSnapshot()).toEqual({
      engagedItemIds: new Set(),
      frozenLastSeenAtMs: 2,
      key: { channelIdText: 'ch-2', kind: 'channel' },
    });
  });

  it('clears the visit when ended', () => {
    beginChannelVisit({ feedUrl: 'https://example.com/feed.xml', kind: 'add-by-rss' }, 3);
    endChannelVisit();
    expect(getChannelVisitSnapshot()).toBeNull();
  });
});
