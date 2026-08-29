import { describe, expect, it } from 'vitest';

import type { SortPrefStore } from './sortPrefs.js';
import {
  parseSortPrefStore,
  readSortPrefFromStore,
  SORT_PREF_MAX_ENTRIES,
  touchSortPrefInStore,
  trimSortPrefStoreToFit,
  writeSortPrefIntoStore,
} from './sortPrefs.js';

const channelScope = (idText: string) => ({ idText, kind: 'channel' }) as const;

/** Most recently used first, so `c0` is the freshest entry and `c${count - 1}` is next to go. */
const buildStore = (count: number): SortPrefStore => {
  const store: SortPrefStore = [];
  for (let index = 0; index < count; index += 1) {
    store.push([`channel:c${index}`, { s: 'recent' }]);
  }
  return store;
};

const oldestScopeIn = (count: number) => channelScope(`c${count - 1}`);

describe('sort preference store', () => {
  it('round-trips a value through the abbreviated storage form', () => {
    const store = writeSortPrefIntoStore([], channelScope('abc'), {
      range: 'week',
      sort: 'top',
      tab: 'clips',
    });

    expect(readSortPrefFromStore(store, channelScope('abc'))).toEqual({
      range: 'week',
      sort: 'top',
      tab: 'clips',
    });
  });

  it('keeps two instances independent', () => {
    let store = writeSortPrefIntoStore([], channelScope('abc'), { sort: 'oldest' });
    store = writeSortPrefIntoStore(store, channelScope('xyz'), { sort: 'top' });

    expect(readSortPrefFromStore(store, channelScope('abc'))?.sort).toBe('oldest');
    expect(readSortPrefFromStore(store, channelScope('xyz'))?.sort).toBe('top');
  });

  it('reports nothing stored for an instance that was never written', () => {
    const store = writeSortPrefIntoStore([], channelScope('abc'), { sort: 'oldest' });

    expect(readSortPrefFromStore(store, channelScope('never-seen'))).toBeNull();
  });

  it('merges a change into what the instance already remembers', () => {
    let store = writeSortPrefIntoStore([], channelScope('abc'), { sort: 'top', tab: 'clips' });
    store = writeSortPrefIntoStore(store, channelScope('abc'), { range: 'month' });

    expect(readSortPrefFromStore(store, channelScope('abc'))).toEqual({
      range: 'month',
      sort: 'top',
      tab: 'clips',
    });
  });

  it('evicts the least recently used entry past the window', () => {
    let store = buildStore(SORT_PREF_MAX_ENTRIES);
    const leastRecentlyUsed = oldestScopeIn(SORT_PREF_MAX_ENTRIES);
    expect(readSortPrefFromStore(store, leastRecentlyUsed)).not.toBeNull();

    store = writeSortPrefIntoStore(store, channelScope('overflow'), { sort: 'top' });

    expect(store).toHaveLength(SORT_PREF_MAX_ENTRIES);
    expect(readSortPrefFromStore(store, channelScope('overflow'))?.sort).toBe('top');
    expect(readSortPrefFromStore(store, leastRecentlyUsed)).toBeNull();
  });

  it('keeps a revisited instance from aging out', () => {
    let store = buildStore(SORT_PREF_MAX_ENTRIES);
    const revisited = oldestScopeIn(SORT_PREF_MAX_ENTRIES);

    store = touchSortPrefInStore(store, revisited);
    store = writeSortPrefIntoStore(store, channelScope('overflow'), { sort: 'top' });

    expect(readSortPrefFromStore(store, revisited)).not.toBeNull();
  });

  it('does not spend a slot on an instance with nothing stored', () => {
    const store = buildStore(3);

    expect(touchSortPrefInStore(store, channelScope('never-seen'))).toBe(store);
  });

  it('forgets a field when a control returns to storing nothing', () => {
    let store = writeSortPrefIntoStore([], channelScope('abc'), { range: 'week', sort: 'top' });
    store = writeSortPrefIntoStore(store, channelScope('abc'), {
      range: undefined,
      sort: 'recent',
    });

    expect(readSortPrefFromStore(store, channelScope('abc'))).toEqual({ sort: 'recent' });
  });

  it('drops the entry entirely when nothing is left worth remembering', () => {
    let store = writeSortPrefIntoStore([], channelScope('abc'), { sort: 'top' });
    store = writeSortPrefIntoStore(store, channelScope('abc'), { sort: undefined });

    expect(store).toHaveLength(0);
  });

  it('reads a hand-edited payload as nothing rather than passing it through', () => {
    const parsed = parseSortPrefStore([
      ['channel:abc', { s: 'recent' }],
      'not-an-entry',
      ['channel:broken'],
      [42, { s: 'recent' }],
      ['channel:empty', {}],
      ['channel:unknown-field', { zzz: 'recent' }],
      ['channel:abc', { s: 'oldest' }],
    ]);

    expect(parsed).toEqual([['channel:abc', { s: 'recent' }]]);
  });

  it('reads a non-array payload as an empty store', () => {
    expect(parseSortPrefStore({ 'channel:abc': { s: 'recent' } })).toEqual([]);
    expect(parseSortPrefStore(undefined)).toEqual([]);
  });

  it('trims from the least recently used end until the cookie fits', () => {
    const store = buildStore(SORT_PREF_MAX_ENTRIES);
    const padding = 'x'.repeat(3800);

    const trimmed = trimSortPrefStoreToFit(store, (candidate) =>
      JSON.stringify({ padding, sp: candidate })
    );

    expect(trimmed).toHaveLength(0);
  });

  it('leaves a store that already fits alone', () => {
    const store = buildStore(5);

    expect(trimSortPrefStoreToFit(store, (candidate) => JSON.stringify(candidate))).toBe(store);
  });
});
