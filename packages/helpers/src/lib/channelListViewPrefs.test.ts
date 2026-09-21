import { describe, expect, it } from 'vitest';

import {
  BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS,
  browseListViewModeScope,
  DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS,
  directoryListViewModeScope,
  HOME_LIST_VIEW_MODE_SCOPE_ALBUMS,
  HOME_LIST_VIEW_MODE_SCOPE_ALL,
  HOME_LIST_VIEW_MODE_SCOPE_ARTISTS,
  HOME_LIST_VIEW_MODE_SCOPE_PODCASTS,
  homeListViewModeScopeForMedium,
  isChannelListViewModeType,
} from './channelListViewPrefs.js';
import { buildSortPrefScopeKey } from './sortPrefs.js';

describe('channel list view-mode scopes', () => {
  it('keeps Home podcasts, Browse podcasts, and the directory on different keys', () => {
    expect(buildSortPrefScopeKey(HOME_LIST_VIEW_MODE_SCOPE_PODCASTS)).toBe('home-podcasts');
    expect(buildSortPrefScopeKey(BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS)).toBe('browse-podcasts');
    expect(buildSortPrefScopeKey(DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)).toBe('podcasts');
    expect(buildSortPrefScopeKey(HOME_LIST_VIEW_MODE_SCOPE_PODCASTS)).not.toBe(
      buildSortPrefScopeKey(BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS)
    );
    expect(buildSortPrefScopeKey(DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)).not.toBe(
      buildSortPrefScopeKey(BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS)
    );
    expect(buildSortPrefScopeKey(HOME_LIST_VIEW_MODE_SCOPE_PODCASTS)).not.toBe(
      buildSortPrefScopeKey(DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS)
    );
  });

  it('looks up Browse and directory scopes without inventing a second podcasts key', () => {
    expect(browseListViewModeScope('podcasts')).toEqual(BROWSE_LIST_VIEW_MODE_SCOPE_PODCASTS);
    expect(directoryListViewModeScope('podcasts')).toEqual(DIRECTORY_LIST_VIEW_MODE_SCOPE_PODCASTS);
  });

  it('maps a Home medium chip onto the Home view-mode scope', () => {
    expect(homeListViewModeScopeForMedium('av')).toEqual(HOME_LIST_VIEW_MODE_SCOPE_PODCASTS);
    expect(homeListViewModeScopeForMedium('publisher-music')).toEqual(
      HOME_LIST_VIEW_MODE_SCOPE_ARTISTS
    );
    expect(homeListViewModeScopeForMedium('music')).toEqual(HOME_LIST_VIEW_MODE_SCOPE_ALBUMS);
    expect(homeListViewModeScopeForMedium('all')).toEqual(HOME_LIST_VIEW_MODE_SCOPE_ALL);
  });

  it('recognises only channel types that can draw as a grid', () => {
    expect(isChannelListViewModeType('podcasts')).toBe(true);
    expect(isChannelListViewModeType('artists')).toBe(true);
    expect(isChannelListViewModeType('albums')).toBe(true);
    expect(isChannelListViewModeType('episodes')).toBe(false);
  });
});
