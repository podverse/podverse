import { describe, expect, it } from 'vitest';

import { browsePlaylistListParams } from './browsePlaylistQuery';

describe('browsePlaylistListParams', () => {
  it('omits tag when none is applied and when the name is blank', () => {
    expect(browsePlaylistListParams({ page: 1, range: 'week', sort: 'recent', tag: null })).toEqual(
      {
        medium: 'all',
        page: 1,
        range: null,
        sort: 'recent',
        type: 'public',
      }
    );

    expect(
      browsePlaylistListParams({ page: 1, range: 'week', sort: 'recent', tag: '   ' })
    ).toEqual({
      medium: 'all',
      page: 1,
      range: null,
      sort: 'recent',
      type: 'public',
    });
  });

  it('sends the folded tag on the public list', () => {
    expect(
      browsePlaylistListParams({
        page: 1,
        range: 'week',
        sort: 'recent',
        tag: '  ADAM CURRY ',
      })
    ).toEqual({
      medium: 'all',
      page: 1,
      range: null,
      sort: 'recent',
      tag: 'adam curry',
      type: 'public',
    });
  });

  it('sends a top window and the folded tag together', () => {
    expect(
      browsePlaylistListParams({ page: 1, range: 'week', sort: 'top', tag: '  News ' })
    ).toEqual({
      medium: 'all',
      page: 1,
      range: 'week',
      sort: 'top',
      tag: 'news',
      type: 'public',
    });
  });

  it('omits a tag of 51 characters', () => {
    expect(
      browsePlaylistListParams({
        page: 1,
        range: 'week',
        sort: 'recent',
        tag: 'a'.repeat(51),
      })
    ).toEqual({
      medium: 'all',
      page: 1,
      range: null,
      sort: 'recent',
      type: 'public',
    });
  });
});
