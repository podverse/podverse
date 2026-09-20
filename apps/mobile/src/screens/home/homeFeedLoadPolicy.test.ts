import { describe, expect, it } from 'vitest';

import {
  HOME_FEED_LOAD_SOURCES,
  homeFeedKeepsVisibleRowsOnError,
  homeFeedShowsBlockingSpinner,
  homeFeedShowsRefreshControl,
} from './homeFeedLoadPolicy';

describe('homeFeedShowsBlockingSpinner', () => {
  it('is false for every Home reread source', () => {
    for (const source of HOME_FEED_LOAD_SOURCES) {
      expect(homeFeedShowsBlockingSpinner(source)).toBe(false);
    }
  });
});

describe('homeFeedShowsRefreshControl', () => {
  it('is true only for pull-to-refresh', () => {
    expect(homeFeedShowsRefreshControl('refresh')).toBe(true);
    expect(homeFeedShowsRefreshControl('initial')).toBe(false);
    expect(homeFeedShowsRefreshControl('retry')).toBe(false);
    expect(homeFeedShowsRefreshControl('synced')).toBe(false);
  });
});

describe('homeFeedKeepsVisibleRowsOnError', () => {
  it('keeps rows for background rereads and pull-to-refresh', () => {
    expect(homeFeedKeepsVisibleRowsOnError('synced')).toBe(true);
    expect(homeFeedKeepsVisibleRowsOnError('refresh')).toBe(true);
    expect(homeFeedKeepsVisibleRowsOnError('initial')).toBe(false);
    expect(homeFeedKeepsVisibleRowsOnError('retry')).toBe(false);
  });
});
