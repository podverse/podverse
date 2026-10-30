import { describe, expect, it } from 'vitest';

import { flattenBrowseCategories, visibleBrowseCategories } from './browseCategories';
import {
  BROWSE_MEDIA_TYPE_ORDER,
  BROWSE_SORT_OPTIONS,
  browseSortToApiRange,
  DEFAULT_BROWSE_RANGE,
  DEFAULT_BROWSE_SORT,
  isBrowseCategoryMediaType,
  isBrowseRangeOption,
  isPlayableDirectoryMediaType,
  shouldShowBrowseCategoryChip,
  shouldShowBrowseSortChip,
} from './browseTypes';

describe('browseTypes', () => {
  it('lists Livestreams immediately after Tracks', () => {
    const tracksIndex = BROWSE_MEDIA_TYPE_ORDER.indexOf('tracks');
    expect(BROWSE_MEDIA_TYPE_ORDER[tracksIndex + 1]).toBe('livestreams');
  });

  it('offers categories on podcasts, episodes, and clips only', () => {
    expect(isBrowseCategoryMediaType('podcasts')).toBe(true);
    expect(isBrowseCategoryMediaType('episodes')).toBe(true);
    expect(isBrowseCategoryMediaType('clips')).toBe(true);
    expect(isBrowseCategoryMediaType('artists')).toBe(false);
    expect(isBrowseCategoryMediaType('albums')).toBe(false);
    expect(isBrowseCategoryMediaType('tracks')).toBe(false);
    expect(isBrowseCategoryMediaType('livestreams')).toBe(false);
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

  it('hides Categories on media types that have no directory categories', () => {
    expect(shouldShowBrowseCategoryChip('podcasts')).toBe(true);
    expect(shouldShowBrowseCategoryChip('episodes')).toBe(true);
    expect(shouldShowBrowseCategoryChip('artists')).toBe(false);
    expect(shouldShowBrowseCategoryChip('livestreams')).toBe(false);
    expect(shouldShowBrowseCategoryChip('playlists')).toBe(false);
  });

  it('offers Recent and Top and opens on Top', () => {
    expect(BROWSE_SORT_OPTIONS).toEqual(['recent', 'top']);
    expect(DEFAULT_BROWSE_SORT).toBe('top');
    expect(DEFAULT_BROWSE_RANGE).toBe('week');
  });

  it('sends a stats window only for Top', () => {
    expect(browseSortToApiRange('top', 'month')).toBe('month');
    expect(browseSortToApiRange('recent', 'month')).toBeNull();
  });

  it('hides the sort chip while the category picker is open', () => {
    expect(shouldShowBrowseSortChip('podcasts', false)).toBe(true);
    expect(shouldShowBrowseSortChip('artists', false)).toBe(true);
    expect(shouldShowBrowseSortChip('livestreams', false)).toBe(false);
    expect(shouldShowBrowseSortChip('podcasts', true)).toBe(false);
  });

  it('treats only item-like rows as playable', () => {
    expect(isPlayableDirectoryMediaType('episodes')).toBe(true);
    expect(isPlayableDirectoryMediaType('clips')).toBe(true);
    expect(isPlayableDirectoryMediaType('tracks')).toBe(true);
    expect(isPlayableDirectoryMediaType('livestreams')).toBe(true);
    expect(isPlayableDirectoryMediaType('podcasts')).toBe(false);
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
      {
        depth: 0,
        hasChildren: true,
        mappingKey: 'arts',
        rootMappingKey: 'arts',
      },
      {
        depth: 1,
        hasChildren: false,
        mappingKey: 'books',
        rootMappingKey: 'arts',
      },
    ]);
  });
});

describe('visibleBrowseCategories', () => {
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
    {
      display_name: 'Comedy',
      id: 2,
      mapping_key: 'comedy',
      parent_id: null,
      slug: 'comedy',
    },
  ]);

  it('hides nested children until their top-level parent is expanded', () => {
    expect(visibleBrowseCategories(rows, new Set()).map((row) => row.mappingKey)).toEqual([
      'arts',
      'comedy',
    ]);
  });

  it('shows a parent branch when that root is expanded', () => {
    expect(visibleBrowseCategories(rows, new Set(['arts'])).map((row) => row.mappingKey)).toEqual([
      'arts',
      'books',
      'comedy',
    ]);
  });
});
