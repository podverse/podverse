import { describe, expect, it } from 'vitest';

import {
  normalizeEmbedBuilderParamsForSource,
  resolveEmbedBuilderListAvailability,
} from '../embedBuilderTypes';

describe('resolveEmbedBuilderListAvailability', () => {
  it('forces list on for a podcast channel source', () => {
    expect(
      resolveEmbedBuilderListAvailability({
        channel: 'podcast-1',
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('forced-on');
  });

  it('allows toggling list for an episode source', () => {
    expect(
      resolveEmbedBuilderListAvailability({
        channel: 'podcast-1',
        item: 'episode-1',
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('toggle');
  });

  it('forces list off for clip, chapter, and official-clip sources', () => {
    expect(
      resolveEmbedBuilderListAvailability({
        channel: 'podcast-1',
        item: 'episode-1',
        clip: 'clip-1',
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('forced-off');

    expect(
      resolveEmbedBuilderListAvailability({
        channel: 'podcast-1',
        item: 'episode-1',
        clip: null,
        itemChapter: 'chapter-1',
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('forced-off');

    expect(
      resolveEmbedBuilderListAvailability({
        channel: 'podcast-1',
        item: 'episode-1',
        clip: null,
        itemChapter: null,
        itemSoundbite: 'official-clip-1',
        playlist: null,
      })
    ).toBe('forced-off');
  });

  it('forces list on for playlist sources', () => {
    expect(
      resolveEmbedBuilderListAvailability({
        channel: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: 'playlist-1',
      })
    ).toBe('forced-on');
  });
});

describe('normalizeEmbedBuilderParamsForSource', () => {
  it('coerces list off to on for podcast-channel sources', () => {
    expect(
      normalizeEmbedBuilderParamsForSource({
        playerSize: 'compact',
        listEnabled: false,
        mediaPreference: 'audio',
        channel: 'podcast-1',
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
        playlistItem: null,
        sort: null,
        listContentType: 'episodes',
        listSort: 'recent',
        listRange: null,
        startSeconds: 0,
        playIdText: null,
        listVisibleRows: 5,
        showChapterMarkers: true,
        aspectRatio: '16x9',
        borderColor: '#444444',
      }).listEnabled
    ).toBe(true);
  });
});
