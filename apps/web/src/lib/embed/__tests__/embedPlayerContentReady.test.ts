import { describe, expect, it } from 'vitest';

import {
  embedFallbackHasDisplayContent,
  getEmbedResourceIdentity,
  getLoadedEmbedResourceIdentity,
  isEmbedPlayerContentReady,
} from '../embedPlayerContentReady';
import type { EmbedSingleResourcePayload } from '../fetchEmbedSingleResource';

function buildResource(
  overrides: Partial<EmbedSingleResourcePayload> = {}
): EmbedSingleResourcePayload {
  return {
    channel: {
      id: 1,
      id_text: 'ch1',
      title: 'Channel title',
    },
    item: {
      id: 2,
      id_text: 'item1',
      title: 'Item title',
    },
    clip: null,
    itemChapter: null,
    itemSoundbite: null,
    ...overrides,
  } as EmbedSingleResourcePayload;
}

describe('getEmbedResourceIdentity', () => {
  it('prefers clip identity when present', () => {
    const resource = buildResource({
      clip: { id: 3, id_text: 'clip1', title: 'Clip' } as EmbedSingleResourcePayload['clip'],
    });

    expect(getEmbedResourceIdentity(resource)).toBe('clip:clip1');
  });

  it('falls back to item identity', () => {
    expect(getEmbedResourceIdentity(buildResource())).toBe('item:item1');
  });
});

describe('embedFallbackHasDisplayContent', () => {
  it('returns false when resource is null', () => {
    expect(embedFallbackHasDisplayContent(null)).toBe(false);
  });

  it('returns true when channel or item title exists', () => {
    expect(embedFallbackHasDisplayContent(buildResource())).toBe(true);
  });
});

describe('isEmbedPlayerContentReady', () => {
  it('returns true for audio as soon as fallback metadata is available', () => {
    expect(
      isEmbedPlayerContentReady({
        fallbackResource: buildResource(),
        mpChannel: null,
        mpItem: null,
        mpClip: null,
        mpItemChapter: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);
  });

  it('returns false when no fallback/header/loaded identity exists', () => {
    expect(
      isEmbedPlayerContentReady({
        fallbackResource: null,
        mpChannel: null,
        mpItem: null,
        mpClip: null,
        mpItemChapter: null,
        mpItemSoundbite: null,
      })
    ).toBe(false);
  });

  it('returns true for list embeds that only have a header title', () => {
    expect(
      isEmbedPlayerContentReady({
        fallbackResource: null,
        headerTitle: 'Album title',
        mpChannel: null,
        mpItem: null,
        mpClip: null,
        mpItemChapter: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);
  });

  it('returns true for audio once playback context is loaded without fallback', () => {
    const resource = buildResource();

    expect(
      isEmbedPlayerContentReady({
        fallbackResource: null,
        mpChannel: resource.channel,
        mpItem: resource.item,
        mpClip: null,
        mpItemChapter: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);
  });

  it('returns false for audio with no fallback, header, or playback context', () => {
    expect(
      isEmbedPlayerContentReady({
        fallbackResource: null,
        mpChannel: null,
        mpItem: null,
        mpClip: null,
        mpItemChapter: null,
        mpItemSoundbite: null,
      })
    ).toBe(false);
  });

  it('returns true when loaded identity matches target identity', () => {
    const resource = buildResource();

    expect(
      isEmbedPlayerContentReady({
        fallbackResource: resource,
        mpChannel: null,
        mpItem: resource.item,
        mpClip: null,
        mpItemChapter: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);
  });
});

describe('getLoadedEmbedResourceIdentity', () => {
  it('matches getEmbedResourceIdentity for the same payload', () => {
    const resource = buildResource({
      itemChapter: {
        id: 4,
        id_text: 'chapter1',
        title: 'Chapter',
      } as EmbedSingleResourcePayload['itemChapter'],
    });

    expect(
      getLoadedEmbedResourceIdentity({
        mpItem: resource.item,
        mpClip: resource.clip,
        mpItemChapter: resource.itemChapter,
        mpItemSoundbite: resource.itemSoundbite,
      })
    ).toBe(getEmbedResourceIdentity(resource));
  });
});
