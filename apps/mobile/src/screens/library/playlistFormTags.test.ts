import { describe, expect, it } from 'vitest';

import { playlistFormTagsForSave } from './playlistFormTags';

const limits = { maxCount: 5, maxLength: 50 };

describe('playlistFormTagsForSave', () => {
  it('returns ok and clears the draft for whitespace without changing the tags array', () => {
    const tags = ['Jazz'];
    const result = playlistFormTagsForSave({
      tags,
      draft: '   ',
      ...limits,
    });

    expect(result).toEqual({ ok: true, tags, clearDraft: true });
    expect(result.tags).toBe(tags);
  });

  it('appends Morning Set with that spelling, clears the draft, and returns a new array', () => {
    const tags = ['existing'];
    const result = playlistFormTagsForSave({
      tags,
      draft: 'Morning Set',
      ...limits,
    });

    expect(result).toEqual({
      ok: true,
      tags: ['existing', 'Morning Set'],
      clearDraft: true,
    });
    expect(result.tags).not.toBe(tags);
  });

  it('keeps two spaces inside the name', () => {
    const result = playlistFormTagsForSave({
      tags: [],
      draft: 'adam  curry',
      ...limits,
    });

    expect(result).toEqual({
      ok: true,
      tags: ['adam  curry'],
      clearDraft: true,
    });
  });

  it('clears the draft and keeps the same tags array for a case-insensitive match', () => {
    const tags = ['Jazz'];
    const result = playlistFormTagsForSave({
      tags,
      draft: 'jazz',
      ...limits,
    });

    expect(result).toEqual({ ok: true, tags, clearDraft: true });
    expect(result.tags).toBe(tags);
  });

  it('keeps the draft and the same tags array when five tags are already stored', () => {
    const tags = ['a', 'b', 'c', 'd', 'e'];
    const result = playlistFormTagsForSave({
      tags,
      draft: 'f',
      maxCount: 5,
      maxLength: 50,
    });

    expect(result).toEqual({ ok: true, tags, clearDraft: false });
    expect(result.tags).toBe(tags);
  });

  it('keeps the draft and the same tags array when the draft is longer than maxLength', () => {
    const tags = ['jazz'];
    const result = playlistFormTagsForSave({
      tags,
      draft: 'abcdefghijk',
      maxCount: 5,
      maxLength: 10,
    });

    expect(result).toEqual({ ok: true, tags, clearDraft: false });
    expect(result.tags).toBe(tags);
  });

  it('appends a draft that is the same length as maxLength', () => {
    const tags: readonly string[] = [];
    const draft = 'a'.repeat(50);
    const result = playlistFormTagsForSave({
      tags,
      draft,
      maxCount: 5,
      maxLength: 50,
    });

    expect(result).toEqual({
      ok: true,
      tags: [draft],
      clearDraft: true,
    });
    expect(result.tags).not.toBe(tags);
  });
});
