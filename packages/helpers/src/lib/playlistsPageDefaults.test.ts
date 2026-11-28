import { describe, expect, it } from 'vitest';

import { parsePlaylistsPageDefaults, playlistsPublicOpening } from './playlistsPageDefaults.js';
import { PLAYLIST_TAG_NAME_MAX_LENGTH } from './playlistTag.js';

const unset = { sort: null, range: null, type: null, medium: null, tag: null };

describe('parsePlaylistsPageDefaults', () => {
  it('leaves sort and range unset when the values are blank', () => {
    const parsed = parsePlaylistsPageDefaults({ sort: '  ', range: '' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual(unset);
  });

  it('accepts a public sort and a range', () => {
    const parsed = parsePlaylistsPageDefaults({ sort: 'top', range: 'month' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual({
      sort: 'top',
      range: 'month',
      type: null,
      medium: null,
      tag: null,
    });
  });

  it('reports a sort or range the public page does not offer', () => {
    const parsed = parsePlaylistsPageDefaults({ sort: 'a_z', range: 'year' });

    expect(parsed.issues).toEqual([
      { field: 'playlistsSort', raw: 'a_z' },
      { field: 'playlistsRange', raw: 'year' },
    ]);
    expect(parsed.defaults).toEqual(unset);
  });

  it('leaves type and medium unset when the values are blank', () => {
    const parsed = parsePlaylistsPageDefaults({ type: '  ', medium: '' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual(unset);
  });

  it('accepts a playlist type and a queue medium', () => {
    const parsed = parsePlaylistsPageDefaults({ type: 'private_followed', medium: 'music' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual({
      sort: null,
      range: null,
      type: 'private_followed',
      medium: 'music',
      tag: null,
    });
  });

  it('reports a type or medium the playlists page does not offer', () => {
    const parsed = parsePlaylistsPageDefaults({ type: 'subscribed', medium: 'video' });

    expect(parsed.issues).toEqual([
      { field: 'playlistsType', raw: 'subscribed' },
      { field: 'playlistsMedium', raw: 'video' },
    ]);
    expect(parsed.defaults).toEqual(unset);
  });

  it('leaves a blank tag unset', () => {
    const parsed = parsePlaylistsPageDefaults({ tag: '   ' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual(unset);
  });

  it('stores a foldable tag name', () => {
    const parsed = parsePlaylistsPageDefaults({ tag: '  Adam   Curry ' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual({ ...unset, tag: 'adam curry' });
  });

  it('reports a tag longer than the name limit and stores null', () => {
    const raw = 'a'.repeat(PLAYLIST_TAG_NAME_MAX_LENGTH + 1);
    const parsed = parsePlaylistsPageDefaults({ tag: raw });

    expect(parsed.issues).toEqual([{ field: 'playlistsTag', raw }]);
    expect(parsed.defaults).toEqual(unset);
  });
});

describe('playlistsPublicOpening', () => {
  it('opens on Recent when sort is unset, and drops a range', () => {
    expect(playlistsPublicOpening({ ...unset, range: 'week' })).toEqual({
      sort: 'recent',
      range: null,
      type: null,
      medium: null,
      tag: null,
    });
  });

  it('uses week when Top has no range', () => {
    expect(playlistsPublicOpening({ ...unset, sort: 'top' })).toEqual({
      sort: 'top',
      range: 'week',
      type: null,
      medium: null,
      tag: null,
    });
  });

  it('keeps a range configured for Top', () => {
    expect(playlistsPublicOpening({ ...unset, sort: 'top', range: 'month' })).toEqual({
      sort: 'top',
      range: 'month',
      type: null,
      medium: null,
      tag: null,
    });
  });

  it('drops a range when the sort is Recent', () => {
    expect(playlistsPublicOpening({ ...unset, sort: 'recent', range: 'week' })).toEqual({
      sort: 'recent',
      range: null,
      type: null,
      medium: null,
      tag: null,
    });
  });

  it('copies type and medium and drops a range when the sort is Recent', () => {
    expect(
      playlistsPublicOpening({
        sort: 'recent',
        range: 'week',
        type: 'public',
        medium: 'music',
        tag: null,
      })
    ).toEqual({
      sort: 'recent',
      range: null,
      type: 'public',
      medium: 'music',
      tag: null,
    });
  });

  it('copies a folded tag', () => {
    expect(playlistsPublicOpening({ ...unset, tag: 'adam curry' })).toEqual({
      sort: 'recent',
      range: null,
      type: null,
      medium: null,
      tag: 'adam curry',
    });
  });
});
