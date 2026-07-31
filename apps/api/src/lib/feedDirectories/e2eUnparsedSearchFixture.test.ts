import { describe, expect, it } from 'vitest';

import {
  buildE2eUnparsedSearchFeed,
  buildE2eUnparsedSearchResponse,
  E2E_UNPARSED_PODCAST_INDEX_ID,
  E2E_UNPARSED_SEARCH_QUERY,
  isE2eUnparsedSearchQuery,
} from './e2eUnparsedSearchFixture.js';

describe('e2eUnparsedSearchFixture', () => {
  it('matches the reserved sentinel query case-insensitively', () => {
    expect(isE2eUnparsedSearchQuery(E2E_UNPARSED_SEARCH_QUERY)).toBe(true);
    expect(isE2eUnparsedSearchQuery('UnparsedFixture')).toBe(true);
    expect(isE2eUnparsedSearchQuery(' podcast ')).toBe(false);
  });

  it('builds a synthetic feed with the reserved Podcast Index id', () => {
    const feed = buildE2eUnparsedSearchFeed();
    expect(feed.id).toBe(E2E_UNPARSED_PODCAST_INDEX_ID);
    expect(feed.title.length).toBeGreaterThan(0);
    expect(feed.url.length).toBeGreaterThan(0);
  });

  it('builds a search response with exactly one feed for Maestro search-unparsed', () => {
    const response = buildE2eUnparsedSearchResponse(E2E_UNPARSED_SEARCH_QUERY);
    expect(response.count).toBe(1);
    expect(response.feeds).toHaveLength(1);
    expect(response.feeds[0]?.id).toBe(E2E_UNPARSED_PODCAST_INDEX_ID);
    expect(response.query).toBe(E2E_UNPARSED_SEARCH_QUERY);
  });
});
