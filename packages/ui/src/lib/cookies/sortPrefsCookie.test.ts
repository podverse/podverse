import { describe, expect, it } from 'vitest';

import { mergeSortPrefsCookie, readSortPrefsMap } from './sortPrefsCookie';

describe('readSortPrefsMap', () => {
  it('reads valid entries and skips invalid shapes', () => {
    const raw =
      '{"badOrder":{"sortBy":"x","sortOrder":"sideways"},"emptyKey":{"sortBy":"","sortOrder":"desc"},"good":{"sortBy":"email","sortOrder":"asc"}}';
    expect(readSortPrefsMap(raw)).toEqual({
      good: { sortBy: 'email', sortOrder: 'asc' },
    });
  });
});

describe('mergeSortPrefsCookie', () => {
  it('inserts and updates a list key', () => {
    const first = mergeSortPrefsCookie(undefined, 'users', {
      sortBy: 'email',
      sortOrder: 'desc',
    });
    expect(readSortPrefsMap(first).users).toEqual({
      sortBy: 'email',
      sortOrder: 'desc',
    });

    const second = mergeSortPrefsCookie(first, 'users', {
      sortOrder: 'asc',
    });
    expect(readSortPrefsMap(second).users).toEqual({
      sortBy: 'email',
      sortOrder: 'asc',
    });
  });

  it('removes a list key when sortBy is cleared', () => {
    const merged = mergeSortPrefsCookie(undefined, 'x', {
      sortBy: 'id',
      sortOrder: 'asc',
    });
    const cleared = mergeSortPrefsCookie(merged, 'x', { sortBy: '' });
    expect(readSortPrefsMap(cleared)).toEqual({});
  });

  it('preserves other list keys when patching one', () => {
    const a = mergeSortPrefsCookie(undefined, 'a', {
      sortBy: 'id',
      sortOrder: 'asc',
    });
    const both = mergeSortPrefsCookie(a, 'b', {
      sortBy: 'name',
      sortOrder: 'desc',
    });
    expect(readSortPrefsMap(both)).toEqual({
      a: { sortBy: 'id', sortOrder: 'asc' },
      b: { sortBy: 'name', sortOrder: 'desc' },
    });
  });
});
