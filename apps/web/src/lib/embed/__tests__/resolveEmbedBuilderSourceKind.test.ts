import { describe, expect, it } from 'vitest';

import { MediumEnum } from '@podverse/helpers';

import { resolveEmbedBuilderSourceKind } from '../resolveEmbedBuilderSourceKind';

describe('resolveEmbedBuilderSourceKind', () => {
  it('prefers official clip over other source fields', () => {
    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'podcast',
        mediumId: MediumEnum.Podcast,
        item: 'episode',
        clip: 'clip',
        itemChapter: 'chapter',
        itemSoundbite: 'soundbite',
        playlist: null,
      })
    ).toBe('official_clip');
  });

  it('resolves chapter, clip, and playlist sources', () => {
    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'podcast',
        mediumId: MediumEnum.Podcast,
        item: 'episode',
        clip: null,
        itemChapter: 'chapter',
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('chapter');

    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'podcast',
        mediumId: MediumEnum.Podcast,
        item: 'episode',
        clip: 'clip',
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('clip');

    expect(
      resolveEmbedBuilderSourceKind({
        channel: null,
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: 'playlist',
      })
    ).toBe('playlist');
  });

  it('resolves episode and track item sources', () => {
    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'podcast',
        mediumId: MediumEnum.Podcast,
        item: 'episode',
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('episode');

    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'album',
        mediumId: MediumEnum.Music,
        item: 'track',
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('track');
  });

  it('resolves channel-only podcast and album sources', () => {
    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'podcast',
        mediumId: MediumEnum.Podcast,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('podcast');

    expect(
      resolveEmbedBuilderSourceKind({
        channel: 'album',
        mediumId: MediumEnum.Music,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('album');
  });

  it('falls back to default when no source is present', () => {
    expect(
      resolveEmbedBuilderSourceKind({
        channel: null,
        mediumId: null,
        item: null,
        clip: null,
        itemChapter: null,
        itemSoundbite: null,
        playlist: null,
      })
    ).toBe('default');
  });
});
