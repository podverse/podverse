import { describe, expect, it } from 'vitest';

import {
  DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM,
  isPodcastIndexSearchMedium,
  resolvePodcastIndexSearchMedium,
  SEARCH_LIST_SORT_PREF_SCOPE,
} from './searchListPrefs.js';
import { buildSortPrefScopeKey } from './sortPrefs.js';

describe('SEARCH_LIST_SORT_PREF_SCOPE', () => {
  it('keys Search as one global list', () => {
    expect(buildSortPrefScopeKey(SEARCH_LIST_SORT_PREF_SCOPE)).toBe('search');
  });
});

describe('isPodcastIndexSearchMedium', () => {
  it('accepts the Podcast Index search chips', () => {
    expect(isPodcastIndexSearchMedium('all')).toBe(true);
    expect(isPodcastIndexSearchMedium('music')).toBe(true);
  });

  it('rejects tokens that are not a search chip', () => {
    expect(isPodcastIndexSearchMedium('podcasts')).toBe(false);
    expect(isPodcastIndexSearchMedium('')).toBe(false);
  });
});

describe('resolvePodcastIndexSearchMedium', () => {
  it('returns all when nothing is stored', () => {
    expect(resolvePodcastIndexSearchMedium(null)).toBe(DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM);
    expect(resolvePodcastIndexSearchMedium(undefined)).toBe(DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM);
    expect(resolvePodcastIndexSearchMedium({})).toBe(DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM);
  });

  it('restores a stored All or Music chip', () => {
    expect(resolvePodcastIndexSearchMedium({ type: 'all' })).toBe('all');
    expect(resolvePodcastIndexSearchMedium({ type: 'music' })).toBe('music');
  });

  it('falls back when the stored token is not a search chip', () => {
    expect(resolvePodcastIndexSearchMedium({ type: 'podcasts' })).toBe(
      DEFAULT_PODCAST_INDEX_SEARCH_MEDIUM
    );
  });
});
