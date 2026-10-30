import { describe, expect, it } from 'vitest';

import { browseListScope } from './browseListScope.js';
import { browseListViewModeScope } from './channelListViewPrefs.js';
import { buildSortPrefScopeKey } from './sortPrefs.js';

describe('browseListScope', () => {
  it('gives each Browse media type its own key, apart from Home', () => {
    expect(buildSortPrefScopeKey(browseListScope('episodes'))).toBe('browse-episodes');
    expect(buildSortPrefScopeKey(browseListScope('podcasts'))).not.toBe(
      buildSortPrefScopeKey({ kind: 'list', name: 'podcasts' })
    );
  });

  it('shares the Browse view-mode key for channel types', () => {
    expect(browseListScope('podcasts')).toEqual(browseListViewModeScope('podcasts'));
    expect(browseListScope('artists')).toEqual(browseListViewModeScope('artists'));
    expect(browseListScope('albums')).toEqual(browseListViewModeScope('albums'));
  });
});
