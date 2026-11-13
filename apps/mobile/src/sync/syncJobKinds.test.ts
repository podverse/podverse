import { describe, expect, it } from 'vitest';

import { getSyncLogLabelKey } from './syncJobKinds';

describe('getSyncLogLabelKey', () => {
  it('returns the queue label for a planned job kind', () => {
    expect(getSyncLogLabelKey('popularity-ranks')).toBe('sync.job.subscriptions');
    expect(getSyncLogLabelKey('home-clips')).toBe('sync.job.clips');
    expect(getSyncLogLabelKey('home-livestreams')).toBe('sync.job.live_status');
    expect(getSyncLogLabelKey('add-by-rss-listed-feeds')).toBe('sync.job.rss_feeds');
    expect(getSyncLogLabelKey('add-by-rss-device-parse')).toBe('sync.job.rss_feeds');
    expect(getSyncLogLabelKey('add-by-rss-listed-resolve')).toBe('sync.job.rss_feeds');
  });

  it('returns the Home diagnostic label so a hung cache read is readable in More', () => {
    expect(getSyncLogLabelKey('home-feed-read')).toBe('sync.job.home_feed');
  });

  it('returns null for an unknown kind so the raw token stays quoteable', () => {
    expect(getSyncLogLabelKey('not-a-real-kind')).toBeNull();
  });
});
