import { describe, expect, it } from 'vitest';

import type { PlaylistsPagePublicOpening } from '@podverse/helpers';
import { PLAYLIST_TAG_NAME_MAX_LENGTH } from '@podverse/helpers';

import type { PlaylistsFilterDefaults } from '../../utils/localSettings/localSettings';
import { playlistQueryTag, resolvePlaylistsPageFilters } from './resolvePlaylistsPageFilters';

const emptyUrl = {
  page: 1,
  type: null,
  sort: null,
  range: null,
  medium: null,
  tag: undefined,
};

function opening(overrides: Partial<PlaylistsPagePublicOpening> = {}): PlaylistsPagePublicOpening {
  return {
    sort: overrides.sort ?? 'recent',
    range: overrides.range ?? null,
    type: overrides.type ?? null,
    medium: overrides.medium ?? null,
    tag: overrides.tag ?? null,
  };
}

function cookie(overrides: Partial<PlaylistsFilterDefaults> = {}): PlaylistsFilterDefaults {
  const saved: PlaylistsFilterDefaults = {
    type: overrides.type ?? 'public',
    sort: overrides.sort ?? 'recent',
    range: overrides.range ?? null,
    medium: overrides.medium ?? 'all',
  };
  if ('tag' in overrides) {
    saved.tag = overrides.tag;
  }
  return saved;
}

describe('resolvePlaylistsPageFilters', () => {
  it('opens a signed-out visitor on Global when the type opening is private', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: emptyUrl,
      cookie: undefined,
      opening: opening({ type: 'private', sort: 'top', range: 'month' }),
    });

    expect(result.currentType).toBe('public');
    expect(result.currentSort).toBe('top');
    expect(result.currentRange).toBe('month');
    expect(result.tag).toBeNull();
  });

  it('opens a signed-in visitor on My Playlists when the type opening is unset', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: true,
      useEnvTag: true,
      url: emptyUrl,
      cookie: undefined,
      opening: opening({ type: null, sort: 'top', range: 'week' }),
    });

    expect(result.currentType).toBe('private');
    expect(result.currentSort).toBe('a_z');
    expect(result.currentRange).toBeNull();
    expect(result.tag).toBeNull();
  });

  it('uses a public type opening with its sort and range for a signed-in visitor', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: true,
      useEnvTag: true,
      url: emptyUrl,
      cookie: undefined,
      opening: opening({ type: 'public', sort: 'top', range: 'month' }),
    });

    expect(result.currentType).toBe('public');
    expect(result.currentSort).toBe('top');
    expect(result.currentRange).toBe('month');
    expect(result.tag).toBeNull();
  });

  it('lets a URL type beat a saved type, and a saved type beat the opening', () => {
    const sharedOpening = opening({ type: 'public' });
    const saved = cookie({ type: 'private_followed' });

    const fromUrl = resolvePlaylistsPageFilters({
      isAuthenticated: true,
      useEnvTag: true,
      url: { ...emptyUrl, type: 'public' },
      cookie: saved,
      opening: sharedOpening,
    });
    expect(fromUrl.currentType).toBe('public');
    expect(fromUrl.tag).toBeNull();

    const fromCookie = resolvePlaylistsPageFilters({
      isAuthenticated: true,
      useEnvTag: true,
      url: emptyUrl,
      cookie: saved,
      opening: sharedOpening,
    });
    expect(fromCookie.currentType).toBe('private_followed');
    expect(fromCookie.tag).toBeNull();
  });

  it('lets a URL medium beat a cookie medium and the opening, then the cookie, then All', () => {
    const sharedOpening = opening({ medium: 'music' });
    const saved = cookie({ medium: 'av' });

    const fromUrl = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: { ...emptyUrl, medium: 'all' },
      cookie: saved,
      opening: sharedOpening,
    });
    expect(fromUrl.currentMedium).toBe('all');
    expect(fromUrl.tag).toBeNull();

    const fromCookie = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: emptyUrl,
      cookie: saved,
      opening: sharedOpening,
    });
    expect(fromCookie.currentMedium).toBe('av');
    expect(fromCookie.tag).toBeNull();

    const fromOpening = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: emptyUrl,
      cookie: undefined,
      opening: opening({ medium: 'music' }),
    });
    expect(fromOpening.currentMedium).toBe('music');
    expect(fromOpening.tag).toBeNull();

    const fromDefault = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: emptyUrl,
      cookie: undefined,
      opening: opening({ medium: null }),
    });
    expect(fromDefault.currentMedium).toBe('all');
    expect(fromDefault.tag).toBeNull();
  });

  it('keeps a signed-out URL type of private and uses the public opening sort', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: { ...emptyUrl, type: 'private' },
      cookie: undefined,
      opening: opening({ type: 'public', sort: 'top', range: 'month' }),
    });

    expect(result.currentType).toBe('private');
    expect(result.currentSort).toBe('top');
    expect(result.currentRange).toBe('month');
    expect(result.tag).toBeNull();
  });

  it('lets a cookie sort beat the opening sort, and treats a null cookie range as unset', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: true,
      useEnvTag: true,
      url: emptyUrl,
      cookie: cookie({ type: 'public', sort: 'recent', range: null }),
      opening: opening({ type: 'public', sort: 'top', range: 'week' }),
    });

    expect(result.currentSort).toBe('recent');
    expect(result.currentRange).toBe('week');
    expect(result.tag).toBeNull();
  });

  it('lets a tag URL beat a cookie tag and the opening, and stores the folded name', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: { ...emptyUrl, tag: 'Adam Curry' },
      cookie: cookie({ tag: 'other' }),
      opening: opening({ tag: 'env' }),
    });

    expect(result.tag).toBe('adam curry');
  });

  it('lets a blank tag URL beat a cookie tag and the opening', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: { ...emptyUrl, tag: '' },
      cookie: cookie({ tag: 'other' }),
      opening: opening({ tag: 'env' }),
    });

    expect(result.tag).toBeNull();
  });

  it('lets a tag URL past the name limit fall through to the cookie', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: { ...emptyUrl, tag: 'a'.repeat(PLAYLIST_TAG_NAME_MAX_LENGTH + 1) },
      cookie: cookie({ tag: 'saved' }),
      opening: opening({ tag: 'env' }),
    });

    expect(result.tag).toBe('saved');
  });

  it('lets a saved clear beat the opening tag', () => {
    const result = resolvePlaylistsPageFilters({
      isAuthenticated: false,
      useEnvTag: true,
      url: emptyUrl,
      cookie: cookie({ tag: null }),
      opening: opening({ tag: 'news' }),
    });

    expect(result.tag).toBeNull();
  });

  it('uses the opening tag when the cookie has no tag key, and skips it off /playlists', () => {
    const saved = cookie();
    const withEnv = opening({ tag: 'news' });

    expect(
      resolvePlaylistsPageFilters({
        isAuthenticated: false,
        useEnvTag: true,
        url: emptyUrl,
        cookie: saved,
        opening: withEnv,
      }).tag
    ).toBe('news');

    expect(
      resolvePlaylistsPageFilters({
        isAuthenticated: false,
        useEnvTag: false,
        url: emptyUrl,
        cookie: saved,
        opening: withEnv,
      }).tag
    ).toBeNull();
  });
});

describe('playlistQueryTag', () => {
  it('sends a folded tag only for a public list', () => {
    expect(playlistQueryTag('private', 'news')).toBeUndefined();
    expect(playlistQueryTag('public', null)).toBeUndefined();
    expect(playlistQueryTag('public', 'news')).toBe('news');
  });
});
