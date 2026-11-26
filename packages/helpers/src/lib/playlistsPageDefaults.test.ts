import { describe, expect, it } from 'vitest';

import { parsePlaylistsPageDefaults, playlistsPublicOpening } from './playlistsPageDefaults.js';

describe('parsePlaylistsPageDefaults', () => {
  it('leaves sort and range unset when the values are blank', () => {
    const parsed = parsePlaylistsPageDefaults({ sort: '  ', range: '' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual({ sort: null, range: null });
  });

  it('accepts a public sort and a range', () => {
    const parsed = parsePlaylistsPageDefaults({ sort: 'top', range: 'month' });

    expect(parsed.issues).toEqual([]);
    expect(parsed.defaults).toEqual({ sort: 'top', range: 'month' });
  });

  it('reports a sort or range the public page does not offer', () => {
    const parsed = parsePlaylistsPageDefaults({ sort: 'a_z', range: 'year' });

    expect(parsed.issues).toEqual([
      { field: 'playlistsSort', raw: 'a_z' },
      { field: 'playlistsRange', raw: 'year' },
    ]);
    expect(parsed.defaults).toEqual({ sort: null, range: null });
  });
});

describe('playlistsPublicOpening', () => {
  it('opens on Recent when sort is unset, and drops a range', () => {
    expect(playlistsPublicOpening({ sort: null, range: 'week' })).toEqual({
      sort: 'recent',
      range: null,
    });
  });

  it('uses week when Top has no range', () => {
    expect(playlistsPublicOpening({ sort: 'top', range: null })).toEqual({
      sort: 'top',
      range: 'week',
    });
  });

  it('keeps a range configured for Top', () => {
    expect(playlistsPublicOpening({ sort: 'top', range: 'month' })).toEqual({
      sort: 'top',
      range: 'month',
    });
  });

  it('drops a range when the sort is Recent', () => {
    expect(playlistsPublicOpening({ sort: 'recent', range: 'week' })).toEqual({
      sort: 'recent',
      range: null,
    });
  });
});
