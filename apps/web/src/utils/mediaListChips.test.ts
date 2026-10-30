import { describe, expect, it } from 'vitest';

import {
  ADD_BY_RSS_CHIPS,
  BROWSE_CHIPS,
  buildMediaListChipPath,
  MEDIA_LIST_CHIP_LABEL_KEYS,
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
