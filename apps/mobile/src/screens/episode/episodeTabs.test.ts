import { describe, expect, it } from 'vitest';

import { resolveEpisodeTabForItem, resolveEpisodeTabs } from './episodeTabs';

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
          hasFunding: false,
          hasSoundbites: true,
          hasTranscript: true,
        },
      })
    ).toEqual(['summary', 'clips', 'chapters', 'soundbites', 'transcript']);
  });

  it('keeps Funding last when the item has funding rows', () => {
    expect(
      resolveEpisodeTabs({
        episode: {
          item_fundings: [{ id: 1 }],
        },
        previewFlags: null,
      })
    ).toEqual(['summary', 'clips', 'funding']);
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
          hasFunding: false,
          hasSoundbites: true,
          hasTranscript: false,
        },
      })
    ).toEqual(['summary', 'clips', 'transcript']);
  });
});

describe('resolveEpisodeTabForItem', () => {
  it('keeps the remembered tab when this item supports it', () => {
    expect(
      resolveEpisodeTabForItem({
        rememberedTab: 'chapters',
        supportedTabs: ['summary', 'clips', 'chapters'],
      })
    ).toBe('chapters');
  });

  it('falls back to Summary when the remembered tab is not available', () => {
    expect(
      resolveEpisodeTabForItem({
        rememberedTab: 'transcript',
        supportedTabs: ['summary', 'clips'],
      })
    ).toBe('summary');
  });
});
