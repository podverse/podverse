import { describe, expect, it } from 'vitest';

import { resolveEpisodeTabs } from './episodeTabs';

const ALWAYS_ON = ['summary', 'clips'] as const;

describe('resolveEpisodeTabs', () => {
  it('offers Summary and Clips before any evidence tabs', () => {
    expect(resolveEpisodeTabs({ episode: null, previewFlags: null })).toEqual([...ALWAYS_ON]);
  });

  it('seeds evidence tabs from cache and keeps them last', () => {
    expect(
      resolveEpisodeTabs({
        episode: null,
        previewFlags: {
          hasChapters: true,
          hasSoundbites: true,
          hasTranscript: true,
        },
      })
    ).toEqual(['summary', 'clips', 'chapters', 'soundbites', 'transcript']);
  });

  it('lets the item DTO override cached evidence', () => {
    expect(
      resolveEpisodeTabs({
        episode: {
          item_soundbites: [],
          item_transcripts: [{ url: 'https://example.com/t' }],
        },
        previewFlags: {
          hasChapters: true,
          hasSoundbites: true,
          hasTranscript: false,
        },
      })
    ).toEqual(['summary', 'clips', 'transcript']);
  });
});
