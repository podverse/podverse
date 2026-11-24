import { describe, expect, it } from 'vitest';

import { resolveEpisodeDetailTabs } from './episodeDetailTabs';

describe('resolveEpisodeDetailTabs', () => {
  it('places Boosts immediately before Funding and keeps always-on chips first', () => {
    expect(
      resolveEpisodeDetailTabs({
        episode: {
          item_fundings: [{ id: 1 }],
        },
        hasBoosts: true,
        previewFlags: null,
      })
    ).toEqual(['summary', 'clips', 'boosts', 'funding']);
  });
});
