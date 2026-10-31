import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_CHIPS,
  BROWSE_CHIPS,
  buildMediaListChipPath,
  MEDIA_LIST_CHIP_LABEL_KEYS,
  mediaListChipChrome,
  resolveMediaListChip,
  shouldShowBrowseEmptyMessage,
  SUBSCRIBED_CHIPS,
} from './mediaListChips';

describe('resolveMediaListChip', () => {
  it('lets a valid URL value win over a stored value', () => {
    expect(
      resolveMediaListChip({
        chips: SUBSCRIBED_CHIPS,
        defaultChip: 'podcasts',
        storedValue: 'episodes',
        urlValue: 'clips',
      })
    ).toEqual({ chip: 'clips', urlChip: 'clips' });
  });

  it('falls back to the stored value when the URL value is not a chip', () => {
    expect(
      resolveMediaListChip({
        chips: SUBSCRIBED_CHIPS,
        defaultChip: 'podcasts',
        storedValue: 'albums',
        urlValue: 'nope',
      })
    ).toEqual({ chip: 'albums', urlChip: null });
  });

  it('falls back to the default when the stored value is not in the chip list', () => {
    expect(
      resolveMediaListChip({
        chips: SUBSCRIBED_CHIPS,
        defaultChip: 'podcasts',
        storedValue: 'playlists',
        urlValue: undefined,
      })
    ).toEqual({ chip: 'podcasts', urlChip: null });
  });

  it('uses the first entry of an array URL value', () => {
    expect(
      resolveMediaListChip({
        chips: BROWSE_CHIPS,
        defaultChip: 'podcasts',
        storedValue: 'episodes',
        urlValue: ['tracks', 'clips'],
      })
    ).toEqual({ chip: 'tracks', urlChip: 'tracks' });
  });

  it('uses the default when nothing is set', () => {
    expect(
      resolveMediaListChip({
        chips: SUBSCRIBED_CHIPS,
        defaultChip: 'podcasts',
        storedValue: undefined,
        urlValue: undefined,
      })
    ).toEqual({ chip: 'podcasts', urlChip: null });
  });
});

describe('buildMediaListChipPath', () => {
  it('omits the default chip and names every other chip in tab', () => {
    expect(buildMediaListChipPath('subscribed', 'podcasts')).toBe('/');
    expect(buildMediaListChipPath('browse', 'episodes')).toBe('/browse?tab=episodes');
    expect(buildMediaListChipPath('add-by-rss', 'podcasts')).toBe('/add-by-rss');
  });
});

describe('chip lists', () => {
  it('matches mobile Home, Browse, and Add by RSS order', () => {
    expect(SUBSCRIBED_CHIPS).toEqual([
      'podcasts',
      'episodes',
      'clips',
      'artists',
      'albums',
      'tracks',
      'livestreams',
    ]);
    expect(BROWSE_CHIPS).toEqual([
      'podcasts',
      'episodes',
      'clips',
      'artists',
      'albums',
      'tracks',
      'livestreams',
      'playlists',
      'users',
    ]);
    expect(ADD_BY_RSS_CHIPS).toEqual([
      'podcasts',
      'episodes',
      'artists',
      'albums',
      'tracks',
      'livestreams',
    ]);
  });

  it('labels Livestreams with the shared catalog key', () => {
    expect(MEDIA_LIST_CHIP_LABEL_KEYS.livestreams).toBe('media.livestream.livestreams');
  });
});

describe('shouldShowBrowseEmptyMessage', () => {
  it('shows the message on an empty first Browse page that has finished loading', () => {
    expect(
      shouldShowBrowseEmptyMessage({
        isBrowse: true,
        isLoading: false,
        page: 1,
        rowCount: 0,
      })
    ).toBe(true);
  });

  it('hides the message while loading, on a later page, when rows exist, or outside Browse', () => {
    expect(
      shouldShowBrowseEmptyMessage({
        isBrowse: true,
        isLoading: true,
        page: 1,
        rowCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowBrowseEmptyMessage({
        isBrowse: true,
        isLoading: false,
        page: 2,
        rowCount: 0,
      })
    ).toBe(false);
    expect(
      shouldShowBrowseEmptyMessage({
        isBrowse: true,
        isLoading: false,
        page: 1,
        rowCount: 1,
      })
    ).toBe(false);
    expect(
      shouldShowBrowseEmptyMessage({
        isBrowse: false,
        isLoading: false,
        page: 1,
        rowCount: 0,
      })
    ).toBe(false);
  });
});

describe('mediaListChipChrome', () => {
  it('gives Subscribed Clips Sort and no gear', () => {
    expect(mediaListChipChrome('subscribed', 'clips')).toEqual({
      showCategory: false,
      showSort: true,
      showViewSelector: false,
      showPlaylistsMedium: false,
      filterDefaultsPage: 'subscribed-clips',
      viewModeScope: null,
    });
  });

  it('gives Livestreams no trailing controls on every chips page', () => {
    expect(mediaListChipChrome('subscribed', 'livestreams')).toEqual({
      showCategory: false,
      showSort: false,
      showViewSelector: false,
      showPlaylistsMedium: false,
      filterDefaultsPage: null,
      viewModeScope: null,
    });
    expect(mediaListChipChrome('browse', 'livestreams').showSort).toBe(false);
    expect(mediaListChipChrome('add-by-rss', 'livestreams').showSort).toBe(false);
  });

  it('gives Browse Podcasts Categories, Sort, and the gear', () => {
    const chrome = mediaListChipChrome('browse', 'podcasts');
    expect(chrome.showCategory).toBe(true);
    expect(chrome.showSort).toBe(true);
    expect(chrome.showViewSelector).toBe(true);
    expect(chrome.filterDefaultsPage).toBe('podcasts');
    expect(chrome.viewModeScope).toEqual({ kind: 'list', name: 'browse-podcasts' });
  });

  it('gives Recommendations only the gear, scoped per chip', () => {
    expect(mediaListChipChrome('recommendations', 'albums')).toEqual({
      showCategory: false,
      showSort: false,
      showViewSelector: true,
      showPlaylistsMedium: false,
      filterDefaultsPage: null,
      viewModeScope: { kind: 'list', name: 'recommendations-albums' },
    });
  });

  it('gives Browse Playlists the medium chip and Sort, and Browse Users Sort only', () => {
    expect(mediaListChipChrome('browse', 'playlists')).toMatchObject({
      showPlaylistsMedium: true,
      showSort: true,
      showViewSelector: false,
      filterDefaultsPage: 'browse-playlists',
    });
    expect(mediaListChipChrome('browse', 'users')).toMatchObject({
      showPlaylistsMedium: false,
      showSort: true,
      showViewSelector: false,
      filterDefaultsPage: 'browse-users',
    });
  });

  it('gives Add by RSS Sort and the gear on every chip but Livestreams', () => {
    expect(mediaListChipChrome('add-by-rss', 'episodes')).toEqual({
      showCategory: false,
      showSort: true,
      showViewSelector: true,
      showPlaylistsMedium: false,
      filterDefaultsPage: null,
      viewModeScope: null,
    });
  });
});
