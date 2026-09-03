import { describe, expect, it } from 'vitest';

import { buildSortPrefScopeKey, mergeSortPrefValue, sanitizeSortPrefValue } from './sortPrefs.js';

describe('buildSortPrefScopeKey', () => {
  it('uses the list name as the whole key for a global list', () => {
    expect(buildSortPrefScopeKey({ kind: 'list', name: 'podcasts' })).toBe('podcasts');
  });

  it('prefixes detail scopes so the id spaces cannot collide', () => {
    expect(buildSortPrefScopeKey({ kind: 'channel', idText: 'abc123' })).toBe('channel:abc123');
    expect(buildSortPrefScopeKey({ kind: 'item', idText: 'abc123' })).toBe('item:abc123');
    expect(buildSortPrefScopeKey({ kind: 'playlist', idText: 'abc123' })).toBe('playlist:abc123');
  });

  it('keeps two channels apart', () => {
    const first = buildSortPrefScopeKey({ kind: 'channel', idText: 'abc' });
    const second = buildSortPrefScopeKey({ kind: 'channel', idText: 'xyz' });
    expect(first).not.toBe(second);
  });

  it('returns null rather than a shared bucket when the identifier is missing', () => {
    expect(buildSortPrefScopeKey({ kind: 'channel', idText: '' })).toBeNull();
    expect(buildSortPrefScopeKey({ kind: 'channel', idText: '   ' })).toBeNull();
    expect(buildSortPrefScopeKey({ kind: 'list', name: '' })).toBeNull();
  });

  it('trims surrounding whitespace so the same id cannot key two entries', () => {
    expect(buildSortPrefScopeKey({ kind: 'channel', idText: '  abc123  ' })).toBe('channel:abc123');
  });
});

describe('sanitizeSortPrefValue', () => {
  it('keeps recognised fields', () => {
    expect(sanitizeSortPrefValue({ filter: 'addByRss', sort: 'recent' })).toEqual({
      filter: 'addByRss',
      sort: 'recent',
    });
  });

  it('drops fields it does not recognise', () => {
    expect(sanitizeSortPrefValue({ query: 'joe rogan', sort: 'a_z' })).toEqual({ sort: 'a_z' });
  });

  it('drops a value long enough to be typed rather than chosen', () => {
    expect(sanitizeSortPrefValue({ sort: 'x'.repeat(65) })).toBeNull();
  });

  it('drops non-string values', () => {
    expect(sanitizeSortPrefValue({ sort: 3, viewMode: ['grid'] })).toBeNull();
  });

  it('returns null when nothing usable survives', () => {
    expect(sanitizeSortPrefValue({})).toBeNull();
    expect(sanitizeSortPrefValue(null)).toBeNull();
    expect(sanitizeSortPrefValue('recent')).toBeNull();
    expect(sanitizeSortPrefValue(['recent'])).toBeNull();
  });
});

describe('mergeSortPrefValue', () => {
  it('leaves fields the write says nothing about alone', () => {
    expect(mergeSortPrefValue({ filter: 'addByRss', sort: 'a_z' }, { sort: 'recent' })).toEqual({
      filter: 'addByRss',
      sort: 'recent',
    });
  });

  it('starts from nothing when there is no existing preference', () => {
    expect(mergeSortPrefValue(null, { sort: 'recent' })).toEqual({ sort: 'recent' });
  });

  it('clears a field written as undefined', () => {
    expect(mergeSortPrefValue({ filter: 'addByRss', sort: 'a_z' }, { filter: undefined })).toEqual({
      sort: 'a_z',
    });
  });

  it('returns null once the last field is cleared', () => {
    expect(mergeSortPrefValue({ sort: 'a_z' }, { sort: undefined })).toBeNull();
  });
});
