import { describe, expect, it } from 'vitest';

import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

import { resolveEmbedPlaybackSegmentRefs } from '../resolveEmbedPlaybackSegmentRefs';

const liveClip = { id_text: 'live-clip' } as DTOClip;
const fallbackClip = { id_text: 'fallback-clip' } as DTOClip;
const liveSoundbite = { id_text: 'live-sb' } as DTOItemSoundbite;
const fallbackSoundbite = { id_text: 'fallback-sb' } as DTOItemSoundbite;

describe('resolveEmbedPlaybackSegmentRefs', () => {
  it('uses fallback clip and soundbite before player content is ready', () => {
    expect(
      resolveEmbedPlaybackSegmentRefs({
        hasPlayerContent: false,
        mpClip: null,
        mpItemSoundbite: null,
        fallbackClip,
        fallbackItemSoundbite,
      })
    ).toEqual({
      clip: fallbackClip,
      itemSoundbite: fallbackSoundbite,
    });
  });

  it('uses live clip while segment playback is active', () => {
    expect(
      resolveEmbedPlaybackSegmentRefs({
        hasPlayerContent: true,
        mpClip: liveClip,
        mpItemSoundbite: null,
        fallbackClip,
        fallbackItemSoundbite: null,
      })
    ).toEqual({
      clip: liveClip,
      itemSoundbite: null,
    });
  });

  it('returns null clip after segment end even when fallback remains', () => {
    expect(
      resolveEmbedPlaybackSegmentRefs({
        hasPlayerContent: true,
        mpClip: null,
        mpItemSoundbite: null,
        fallbackClip,
        fallbackItemSoundbite: fallbackSoundbite,
      })
    ).toEqual({
      clip: null,
      itemSoundbite: null,
    });
  });

  it('uses live soundbite while official-clip playback is active', () => {
    expect(
      resolveEmbedPlaybackSegmentRefs({
        hasPlayerContent: true,
        mpClip: null,
        mpItemSoundbite: liveSoundbite,
        fallbackClip: null,
        fallbackItemSoundbite: fallbackSoundbite,
      })
    ).toEqual({
      clip: null,
      itemSoundbite: liveSoundbite,
    });
  });
});
