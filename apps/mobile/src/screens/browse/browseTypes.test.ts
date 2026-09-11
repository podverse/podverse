import { describe, expect, it } from 'vitest';

import { flattenBrowseCategories } from './browseCategories';
import {
  isBrowseCategoryMediaType,
  isBrowseRangeOption,
  isPlayableDirectoryMediaType,
} from './browseTypes';

describe('browseTypes', () => {
  it('offers categories on podcasts, episodes, clips, and videos only', () => {
    expect(isBrowseCategoryMediaType('podcasts')).toBe(true);
    expect(isBrowseCategoryMediaType('episodes')).toBe(true);
    expect(isBrowseCategoryMediaType('clips')).toBe(true);
    expect(isBrowseCategoryMediaType('videos')).toBe(true);
    expect(isBrowseCategoryMediaType('artists')).toBe(false);
    expect(isBrowseCategoryMediaType('albums')).toBe(false);
    expect(isBrowseCategoryMediaType('tracks')).toBe(false);
    expect(isBrowseCategoryMediaType('playlists')).toBe(false);
    expect(isBrowseCategoryMediaType('users')).toBe(false);
  });

  it('accepts the directory popularity ranges', () => {
    expect(isBrowseRangeOption('day')).toBe(true);
    expect(isBrowseRangeOption('week')).toBe(true);
    expect(isBrowseRangeOption('month')).toBe(true);
    expect(isBrowseRangeOption('all-time')).toBe(true);
    expect(isBrowseRangeOption('year')).toBe(false);
    expect(isBrowseRangeOption('recent')).toBe(false);
  });

  it('treats only item-like rows as playable', () => {
    expect(isPlayableDirectoryMediaType('episodes')).toBe(true);
    expect(isPlayableDirectoryMediaType('clips')).toBe(true);
    expect(isPlayableDirectoryMediaType('tracks')).toBe(true);
    expect(isPlayableDirectoryMediaType('podcasts')).toBe(false);
    expect(isPlayableDirectoryMediaType('videos')).toBe(false);
    expect(isPlayableDirectoryMediaType('playlists')).toBe(false);
    expect(isPlayableDirectoryMediaType('users')).toBe(false);
  });
});

describe('flattenBrowseCategories', () => {
  it('walks parent and child mapping keys', () => {
    const rows = flattenBrowseCategories([
      {
        children: [
          {
            display_name: 'Books',
            id: 20,
            mapping_key: 'books',
            parent_id: 1,
            slug: 'books',
          },
        ],
        display_name: 'Arts',
        id: 1,
        mapping_key: 'arts',
        parent_id: null,
        slug: 'arts',
      },
    ]);

    expect(rows).toEqual([
      { depth: 0, mappingKey: 'arts' },
      { depth: 1, mappingKey: 'books' },
    ]);
  });
});
