import { describe, expect, it } from 'vitest';

import {
  listScreenSortForOffered,
  listScreenSortToMobileHomeSort,
  listScreenViewToWebRows,
  parseListScreenDefaults,
  resolveListScreenChip,
} from './listScreenDefaults.js';

describe('parseListScreenDefaults', () => {
  it('leaves every field unset when the values are blank', () => {
    const parsed = parseListScreenDefaults({
      browseChip: '  ',
      browseSort: '',
      homeChip: undefined,
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults.home).toEqual({ chip: null, sort: null, view: null });
    expect(parsed.defaults.browse).toEqual({ chip: null, sort: null, view: null });
  });

  it('accepts a chip, sort, and view each screen offers', () => {
    const parsed = parseListScreenDefaults({
      browseChip: 'users',
      browseSort: 'recent',
      browseView: 'grid',
      homeChip: 'clips',
      homeSort: 'a_z',
      homeView: 'list',
    });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults.browse).toEqual({ chip: 'users', sort: 'recent', view: 'grid' });
    expect(parsed.defaults.home).toEqual({ chip: 'clips', sort: 'a_z', view: 'list' });
  });

  it('reports an unknown token and leaves that field unset', () => {
    const parsed = parseListScreenDefaults({
      browseChip: 'videos',
      browseSort: 'newest',
      homeView: 'rows',
    });

    expect(parsed.issues).toEqual([
      { field: 'browseChip', raw: 'videos' },
      { field: 'browseSort', raw: 'newest' },
      { field: 'homeView', raw: 'rows' },
    ]);
    expect(parsed.defaults.browse.chip).toBeNull();
    expect(parsed.defaults.browse.sort).toBeNull();
    expect(parsed.defaults.home.view).toBeNull();
  });

  it('rejects a Home chip Browse adds and Home does not', () => {
    const parsed = parseListScreenDefaults({ homeChip: 'playlists' });

    expect(parsed.issues).toEqual([{ field: 'homeChip', raw: 'playlists' }]);
    expect(parsed.defaults.home.chip).toBeNull();
  });
});

describe('listScreenSortForOffered', () => {
  const browseSorts = ['recent', 'top'] as const;

  it('opens Browse on Recent when nothing is set and the chip offers Recent', () => {
    expect(listScreenSortForOffered(null, 'browse', browseSorts, 'top')).toBe('recent');
  });

  it('uses the chip default when the configured sort is not one the chip offers', () => {
    expect(listScreenSortForOffered('a_z', 'browse', browseSorts, 'top')).toBe('top');
    expect(listScreenSortForOffered('a_z', 'home', ['recent', 'top'] as const, 'recent')).toBe(
      'recent'
    );
  });

  it('keeps a Home chip default when Home sort is unset', () => {
    expect(listScreenSortForOffered(null, 'home', ['a_z', 'recent', 'top'] as const, 'a_z')).toBe(
      'a_z'
    );
  });

  it('uses a configured sort the chip offers', () => {
    expect(listScreenSortForOffered('top', 'home', ['a_z', 'recent', 'top'] as const, 'a_z')).toBe(
      'top'
    );
  });
});

describe('listScreenViewToWebRows', () => {
  it('maps list to rows and leaves a blank Browse view on the grid', () => {
    expect(listScreenViewToWebRows('list', 'browse')).toBe('rows');
    expect(listScreenViewToWebRows('grid', 'home')).toBe('grid');
    expect(listScreenViewToWebRows(null, 'browse')).toBe('grid');
    expect(listScreenViewToWebRows(null, 'home')).toBe('rows');
  });
});

describe('listScreenSortToMobileHomeSort', () => {
  it('maps title order to alphabetical and top to popularity', () => {
    expect(listScreenSortToMobileHomeSort('a_z')).toBe('alphabetical');
    expect(listScreenSortToMobileHomeSort('top')).toBe('popularity');
    expect(listScreenSortToMobileHomeSort('recent')).toBe('recent');
  });
});

describe('resolveListScreenChip', () => {
  const chips = ['podcasts', 'episodes'] as const;

  it('uses the fallback when the configured chip is unset or not on this page', () => {
    expect(resolveListScreenChip(null, chips, 'podcasts')).toBe('podcasts');
    expect(resolveListScreenChip('artists', chips, 'podcasts')).toBe('podcasts');
  });

  it('uses a configured chip this page offers', () => {
    expect(resolveListScreenChip('episodes', chips, 'podcasts')).toBe('episodes');
  });
});
