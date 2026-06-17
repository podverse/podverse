import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';

import { buildEmbedBuilderSourcePagePath } from '../fetchEmbedBuilderSourceIntro';

describe('buildEmbedBuilderSourcePagePath', () => {
  it('maps builder source params to main-site paths', () => {
    expect(
      buildEmbedBuilderSourcePagePath({
        channel: 'podcast-id',
        mediumId: MediumEnum.Podcast,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('/podcast/podcast-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: 'album-id',
        mediumId: MediumEnum.Music,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('/album/album-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: 'podcast-id',
        mediumId: MediumEnum.Podcast,
        item: 'episode-id',
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('/episode/episode-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: 'album-id',
        mediumId: MediumEnum.Music,
        item: 'track-id',
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('/track/track-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: null,
        mediumId: null,
        item: null,
        clip: 'clip-id',
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('/clip/clip-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: null,
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: 'chapter-id',
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('/chapter/chapter-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: null,
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: 'soundbite-id',
        playlist: null,
      })
    ).toBe('/official-clip/soundbite-id');

    expect(
      buildEmbedBuilderSourcePagePath({
        channel: null,
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: 'playlist-id',
      })
    ).toBe('/playlist/playlist-id');
  });

  it('returns null when no source is present', () => {
    expect(
      buildEmbedBuilderSourcePagePath({
        channel: null,
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBeNull();
  });
});
