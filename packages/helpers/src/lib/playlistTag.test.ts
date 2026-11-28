import { describe, expect, it } from 'vitest';

import {
  escapePlaylistTagLikePrefix,
  normalizePlaylistTagList,
  normalizePlaylistTagName,
  playlistTagCountLimitMessage,
  playlistTagNameLengthLimitMessage,
} from './playlistTag.js';

describe('normalizePlaylistTagName', () => {
  it('trims, collapses whitespace, and folds case', () => {
    expect(normalizePlaylistTagName('  Adam   Curry ')).toEqual({ ok: true, name: 'adam curry' });
  });

  it('folds hyphenated names without treating the hyphen as a separator', () => {
    expect(normalizePlaylistTagName('ADAM-CURRY')).toEqual({ ok: true, name: 'adam-curry' });
    expect(normalizePlaylistTagName('adam-curry')).toEqual({ ok: true, name: 'adam-curry' });
  });

  it('turns a newline between words into one space', () => {
    expect(normalizePlaylistTagName('Adam\nCurry')).toEqual({ ok: true, name: 'adam curry' });
  });

  it('rejects an empty name', () => {
    expect(normalizePlaylistTagName('')).toEqual({ ok: false, reason: 'empty' });
    expect(normalizePlaylistTagName('   ')).toEqual({ ok: false, reason: 'empty' });
  });

  it('rejects a name longer than the default or the passed limit', () => {
    expect(normalizePlaylistTagName('a'.repeat(51))).toEqual({ ok: false, reason: 'too_long' });
    expect(normalizePlaylistTagName('a'.repeat(41), 40)).toEqual({ ok: false, reason: 'too_long' });
    expect(normalizePlaylistTagName('a'.repeat(40), 40)).toEqual({
      ok: true,
      name: 'a'.repeat(40),
    });
  });
});

describe('normalizePlaylistTagList', () => {
  it('keeps the first copy of a repeated name in a list of five', () => {
    expect(normalizePlaylistTagList(['Foo', 'Bar', 'Baz', 'Foo', 'Qux'])).toEqual({
      ok: true,
      tags: ['foo', 'bar', 'baz', 'qux'],
    });
  });

  it('rejects six entries before dropping blanks', () => {
    expect(normalizePlaylistTagList(['a', 'b', 'c', 'd', 'e', ' '])).toEqual({
      ok: false,
      reason: 'too_many',
    });
  });

  it('accepts six entries when the count limit is 8', () => {
    expect(normalizePlaylistTagList(['a', 'b', 'c', 'd', 'e', 'f'], { maxCount: 8 })).toEqual({
      ok: true,
      tags: ['a', 'b', 'c', 'd', 'e', 'f'],
    });
  });

  it('rejects a list when any entry is too long', () => {
    expect(normalizePlaylistTagList(['a'.repeat(51), 'ok'])).toEqual({
      ok: false,
      reason: 'too_long',
    });
    expect(normalizePlaylistTagList(['a'.repeat(41)], { maxLength: 40 })).toEqual({
      ok: false,
      reason: 'too_long',
    });
    expect(normalizePlaylistTagList(['a'.repeat(40)], { maxLength: 40 })).toEqual({
      ok: true,
      tags: ['a'.repeat(40)],
    });
  });

  it('drops blank entries and accepts a list that becomes empty', () => {
    expect(normalizePlaylistTagList(['', '   '])).toEqual({ ok: true, tags: [] });
    expect(normalizePlaylistTagList(['', '  Hi  ', '   '])).toEqual({ ok: true, tags: ['hi'] });
  });
});

describe('playlist tag limit messages', () => {
  it('names the configured count', () => {
    expect(playlistTagCountLimitMessage(5)).toBe('A playlist has at most 5 tags.');
    expect(playlistTagCountLimitMessage(8)).toBe('A playlist has at most 8 tags.');
  });

  it('names the configured length', () => {
    expect(playlistTagNameLengthLimitMessage(50)).toBe('A tag is at most 50 characters.');
    expect(playlistTagNameLengthLimitMessage(40)).toBe('A tag is at most 40 characters.');
  });
});

describe('escapePlaylistTagLikePrefix', () => {
  it('escapes percent, underscore, and backslash and does not add a wildcard', () => {
    expect(escapePlaylistTagLikePrefix(String.raw`100%_a\b`)).toBe(String.raw`100\%\_a\\b`);
    expect(escapePlaylistTagLikePrefix('adam')).toBe('adam');
  });
});
