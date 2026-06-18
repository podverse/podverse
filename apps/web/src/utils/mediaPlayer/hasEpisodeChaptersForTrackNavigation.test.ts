import { describe, expect, it } from 'vitest';

import { hasEpisodeChaptersForTrackNavigation } from './hasEpisodeChaptersForTrackNavigation.js';

describe('hasEpisodeChaptersForTrackNavigation', () => {
  it('returns true when chapters exist and no clip or soundbite is active', () => {
    expect(
      hasEpisodeChaptersForTrackNavigation({
        mpClip: null,
        mpItemSoundbite: null,
        mpItemChapters: [{ id_text: 'ch-1' } as never],
      })
    ).toBe(true);
  });

  it('returns false when a clip is active', () => {
    expect(
      hasEpisodeChaptersForTrackNavigation({
        mpClip: { id_text: 'clip-1' } as never,
        mpItemSoundbite: null,
        mpItemChapters: [{ id_text: 'ch-1' } as never],
      })
    ).toBe(false);
  });

  it('returns false when chapters are missing', () => {
    expect(
      hasEpisodeChaptersForTrackNavigation({
        mpClip: null,
        mpItemSoundbite: null,
        mpItemChapters: null,
      })
    ).toBe(false);
  });
});
