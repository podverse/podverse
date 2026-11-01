import { describe, expect, it } from 'vitest';

import { clearSearchSession, readSearchSession, searchFetchKey, writeSearchSession } from './searchSession';

describe('searchSession', () => {
  it('keeps the query, chip, and rows until the query is cleared', () => {
    clearSearchSession();
    writeSearchSession({
      feeds: [],
      medium: 'music',
      query: '  news  ',
    });
    expect(readSearchSession()).toEqual({
      feeds: [],
      medium: 'music',
      query: 'news',
    });
    expect(searchFetchKey('music', 'news')).toBe('music\0news');

    writeSearchSession({ feeds: [], medium: 'all', query: '   ' });
    expect(readSearchSession()).toBeNull();
  });
});
