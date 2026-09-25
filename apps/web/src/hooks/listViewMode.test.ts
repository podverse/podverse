import { describe, expect, it } from 'vitest';

import {
  DIRECTORY_LIST_VIEW_MODE_SCOPE_ARTISTS,
  DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS,
  HOME_LIST_VIEW_MODE_SCOPE_PODCASTS,
} from '@podverse/helpers';

import { readSortPrefFromStore, writeSortPrefIntoStore } from '../utils/localSettings/sortPrefs';
import { homeListViewModeScope, resolveListViewMode } from './listViewMode';

describe('resolveListViewMode', () => {
  it('uses the scoped viewMode when it is rows or grid', () => {
    expect(resolveListViewMode('rows')).toBe('rows');
    expect(resolveListViewMode('grid')).toBe('grid');
  });

  it('falls back to rows when the scope has no usable viewMode', () => {
    expect(resolveListViewMode(undefined)).toBe('rows');
    expect(resolveListViewMode('carousel')).toBe('rows');
  });
});

describe('scoped viewMode writes', () => {
  it('does not change another list name', () => {
    let store = writeSortPrefIntoStore([], DIRECTORY_LIST_VIEW_MODE_SCOPE_ARTISTS, {
      viewMode: 'grid',
    });
    store = writeSortPrefIntoStore(store, DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS, {
      viewMode: 'rows',
    });

    expect(readSortPrefFromStore(store, DIRECTORY_LIST_VIEW_MODE_SCOPE_ARTISTS)?.viewMode).toBe(
      'grid'
    );
    expect(readSortPrefFromStore(store, DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode).toBe(
      'rows'
    );
  });

  it('does not change directory podcasts when Home podcasts is grid', () => {
    const store = writeSortPrefIntoStore([], HOME_LIST_VIEW_MODE_SCOPE_PODCASTS, {
      viewMode: 'grid',
    });

    expect(readSortPrefFromStore(store, HOME_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode).toBe('grid');
    expect(readSortPrefFromStore(store, DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode).toBe(
      undefined
    );
    expect(
      resolveListViewMode(
        readSortPrefFromStore(store, DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode
      )
    ).toBe('rows');
  });

  it('does not change Home podcasts when directory podcasts is grid', () => {
    const store = writeSortPrefIntoStore([], DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS, {
      viewMode: 'grid',
    });

    expect(readSortPrefFromStore(store, DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode).toBe(
      'grid'
    );
    expect(readSortPrefFromStore(store, HOME_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode).toBe(
      undefined
    );
    expect(
      resolveListViewMode(
        readSortPrefFromStore(store, HOME_LIST_VIEW_MODE_SCOPE_PODCASTS)?.viewMode
      )
    ).toBe('rows');
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
