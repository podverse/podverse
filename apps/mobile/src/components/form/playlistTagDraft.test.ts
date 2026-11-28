import { describe, expect, it } from 'vitest';

import { commitPlaylistTagDraft, playlistTagSearchQuery } from './playlistTagDraft';

describe('playlistTagSearchQuery', () => {
  it('returns null for an empty or whitespace draft', () => {
    expect(playlistTagSearchQuery('')).toBeNull();
    expect(playlistTagSearchQuery('   ')).toBeNull();
    expect(playlistTagSearchQuery('\n\t ')).toBeNull();
  });

  it('returns the trimmed string when the draft has surrounding spaces', () => {
    expect(playlistTagSearchQuery('  jazz  ')).toBe('jazz');
  });
});

describe('commitPlaylistTagDraft', () => {
  it('appends a trimmed draft and keeps that spelling, not the lowercase comparison key', () => {
    const tags = ['existing'];
    const result = commitPlaylistTagDraft({ tags, draft: '  Jazz  ' });

    expect(result.status).toBe('added');
    expect(result.tags).toEqual(['existing', 'Jazz']);
    expect(result.tags).not.toBe(tags);
    expect(tags).toEqual(['existing']);
  });

  it('keeps spaces inside the name', () => {
    const result = commitPlaylistTagDraft({ tags: [], draft: '  adam curry  ' });

    expect(result).toEqual({ status: 'added', tags: ['adam curry'] });
  });

  it('returns empty and the same tags array for a whitespace-only draft', () => {
    const tags = ['jazz'];
    const result = commitPlaylistTagDraft({ tags, draft: '   ' });

    expect(result.status).toBe('empty');
    expect(result.tags).toBe(tags);
  });

  it('returns duplicate for a case-insensitive match and keeps the same array', () => {
    const lowerTags = ['jazz'];
    const lower = commitPlaylistTagDraft({ tags: lowerTags, draft: 'Jazz' });
    expect(lower.status).toBe('duplicate');
    expect(lower.tags).toBe(lowerTags);

    const upperTags = ['Jazz'];
    const upper = commitPlaylistTagDraft({ tags: upperTags, draft: 'jazz' });
    expect(upper.status).toBe('duplicate');
    expect(upper.tags).toBe(upperTags);
  });

  it('returns duplicate for an exact match and keeps the same array', () => {
    const tags = ['jazz'];
    const result = commitPlaylistTagDraft({ tags, draft: 'jazz' });

    expect(result.status).toBe('duplicate');
    expect(result.tags).toBe(tags);
  });

  it('returns at-max when maxCount equals the current length and keeps the same array', () => {
    const tags = ['a', 'b'];
    const result = commitPlaylistTagDraft({ tags, draft: 'c', maxCount: 2 });

    expect(result.status).toBe('at-max');
    expect(result.tags).toBe(tags);
  });

  it('returns at-max before a duplicate when the list is already full', () => {
    const tags = ['jazz'];
    const result = commitPlaylistTagDraft({ tags, draft: 'Jazz', maxCount: 1 });

    expect(result.status).toBe('at-max');
    expect(result.tags).toBe(tags);
  });

  it('appends when maxCount is omitted', () => {
    const tags = ['a', 'b', 'c', 'd', 'e'];
    const result = commitPlaylistTagDraft({ tags, draft: 'f' });

    expect(result.status).toBe('added');
    expect(result.tags).toEqual(['a', 'b', 'c', 'd', 'e', 'f']);
  });

  it('returns too-long and the same tags array when the trimmed draft exceeds maxLength', () => {
    const tags = ['a'];
    const result = commitPlaylistTagDraft({ tags, draft: '  abcd  ', maxLength: 3 });

    expect(result.status).toBe('too-long');
    expect(result.tags).toBe(tags);
  });

  it('appends when the trimmed draft is the same length as maxLength', () => {
    const result = commitPlaylistTagDraft({ tags: [], draft: '  abc  ', maxLength: 3 });

    expect(result).toEqual({ status: 'added', tags: ['abc'] });
  });

  it('appends a long draft when maxLength is omitted', () => {
    const draft = 'a'.repeat(80);
    const result = commitPlaylistTagDraft({ tags: [], draft });

    expect(result.status).toBe('added');
    expect(result.tags).toEqual([draft]);
  });

  it('returns a new array for added and the same tags reference otherwise', () => {
    const tags = ['Jazz'];
    const unchanged = [
      commitPlaylistTagDraft({ tags, draft: '  ' }),
      commitPlaylistTagDraft({ tags, draft: 'jazz' }),
      commitPlaylistTagDraft({ tags, draft: 'new', maxCount: 1 }),
      commitPlaylistTagDraft({ tags, draft: 'toolong', maxLength: 3 }),
    ];

    for (const result of unchanged) {
      expect(result.status).not.toBe('added');
      expect(result.tags).toBe(tags);
    }

    const added = commitPlaylistTagDraft({ tags, draft: 'blues' });
    expect(added.status).toBe('added');
    expect(added.tags).not.toBe(tags);
    expect(added.tags).toEqual(['Jazz', 'blues']);
  });
});
