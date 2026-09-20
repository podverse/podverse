import { describe, expect, it } from 'vitest';

import { readSortPrefFromStore, writeSortPrefIntoStore } from '../utils/localSettings/sortPrefs';
import {
  homeListViewModeScope,
  LIST_VIEW_MODE_SCOPE_ARTISTS,
  LIST_VIEW_MODE_SCOPE_PODCASTS,
  resolveListViewMode,
} from './listViewMode';

describe('resolveListViewMode', () => {
  it('uses the scoped viewMode when it is rows or grid', () => {
    expect(resolveListViewMode('rows', 'grid')).toBe('rows');
    expect(resolveListViewMode('grid', 'rows')).toBe('grid');
  });

  it('falls back to the global vs when the scope has no viewMode', () => {
    expect(resolveListViewMode(undefined, 'grid')).toBe('grid');
    expect(resolveListViewMode('carousel', 'rows')).toBe('rows');
  });

  it('falls back to rows when neither the scope nor vs has a usable value', () => {
    expect(resolveListViewMode(undefined, undefined)).toBe('rows');
  });
});

describe('scoped viewMode writes', () => {
  it('does not change another list name', () => {
    let store = writeSortPrefIntoStore([], LIST_VIEW_MODE_SCOPE_ARTISTS, { viewMode: 'grid' });
    store = writeSortPrefIntoStore(store, LIST_VIEW_MODE_SCOPE_PODCASTS, { viewMode: 'rows' });

    expect(readSortPrefFromStore(store, LIST_VIEW_MODE_SCOPE_ARTISTS)?.viewMode).toBe('grid');
    expect(readSortPrefFromStore(store, LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode).toBe('rows');
  });
});

describe('homeListViewModeScope', () => {
  it('uses a distinct list name per Home medium chip', () => {
    expect(homeListViewModeScope('av')).toEqual({ kind: 'list', name: 'home-podcasts' });
    expect(homeListViewModeScope('publisher-music')).toEqual({
      kind: 'list',
      name: 'home-artists',
    });
    expect(homeListViewModeScope('music')).toEqual({ kind: 'list', name: 'home-albums' });
    expect(homeListViewModeScope('all')).toEqual({ kind: 'list', name: 'home-all' });
  });
});
