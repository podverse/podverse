import { describe, expect, it } from 'vitest';

import {
  libraryMediumTabsVisible,
  musicHistoryHasRows,
  musicQueueHasRows,
  playlistMediumForCatalog,
  queueListMediumForCatalog,
} from './catalogListMedium';

describe('libraryMediumTabsVisible', () => {
  it('shows both tabs when Music is on, including when the library has no music', () => {
    expect(libraryMediumTabsVisible({ musicEnabled: true, musicLibraryPresent: false })).toBe(true);
    expect(libraryMediumTabsVisible({ musicEnabled: true, musicLibraryPresent: true })).toBe(true);
  });

  it('shows both tabs when Music is off only if the library already has music', () => {
    expect(libraryMediumTabsVisible({ musicEnabled: false, musicLibraryPresent: false })).toBe(
      false
    );
    expect(libraryMediumTabsVisible({ musicEnabled: false, musicLibraryPresent: true })).toBe(true);
  });
});

describe('queueListMediumForCatalog', () => {
  it('keeps music and podcasts when the tabs are visible', () => {
    expect(queueListMediumForCatalog('music', true)).toBe('music');
    expect(queueListMediumForCatalog('av', true)).toBe('av');
  });

  it('lists the podcast queue when the Music tab is hidden', () => {
    expect(queueListMediumForCatalog('music', false)).toBe('av');
    expect(queueListMediumForCatalog('av', false)).toBe('av');
  });
});

describe('musicQueueHasRows', () => {
  it('is false for an empty music queue and true when now-playing or upcoming has a row', () => {
    expect(musicQueueHasRows(null, [])).toBe(false);
    expect(musicQueueHasRows({ id: 1 }, [])).toBe(true);
    expect(musicQueueHasRows(null, [{ id: 2 }])).toBe(true);
  });
});

describe('musicHistoryHasRows', () => {
  it('is false when page 1 and the total are empty, including a null total', () => {
    expect(musicHistoryHasRows({ rowCount: 0, totalCount: 0 })).toBe(false);
    expect(musicHistoryHasRows({ rowCount: 0, totalCount: null })).toBe(false);
  });

  it('is true when page 1 has a row or the total says music history exists', () => {
    expect(musicHistoryHasRows({ rowCount: 1, totalCount: 1 })).toBe(true);
    expect(musicHistoryHasRows({ rowCount: 0, totalCount: 2 })).toBe(true);
  });
});

describe('playlistMediumForCatalog', () => {
  it('keeps All, Podcasts, and Music when the Music filter is visible', () => {
    expect(playlistMediumForCatalog('all', true)).toBe('all');
    expect(playlistMediumForCatalog('av', true)).toBe('av');
    expect(playlistMediumForCatalog('music', true)).toBe('music');
  });

  it('opens All when Music is hidden and leaves All and Podcasts as they are', () => {
    expect(playlistMediumForCatalog('music', false)).toBe('all');
    expect(playlistMediumForCatalog('all', false)).toBe('all');
    expect(playlistMediumForCatalog('av', false)).toBe('av');
  });
});
