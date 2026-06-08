import { describe, expect, it } from 'vitest';

import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

import { shouldEmbedShowChapterInfo } from '../shouldEmbedShowChapterInfo';

const clip = { id_text: 'clip-1' } as DTOClip;
const soundbite = { id_text: 'sb-1' } as DTOItemSoundbite;

describe('shouldEmbedShowChapterInfo', () => {
  it('returns true for episode-only playback', () => {
    expect(
      shouldEmbedShowChapterInfo({
        mpClip: null,
        mpItemSoundbite: null,
      })
    ).toBe(true);
  });

  it('returns false when a clip is active', () => {
    expect(
      shouldEmbedShowChapterInfo({
        mpClip: clip,
        mpItemSoundbite: null,
      })
    ).toBe(false);
  });

  it('returns false when a soundbite is active', () => {
    expect(
      shouldEmbedShowChapterInfo({
        mpClip: null,
        mpItemSoundbite: soundbite,
      })
    ).toBe(false);
  });

  it('uses fallback clip or soundbite before player state is ready', () => {
    expect(
      shouldEmbedShowChapterInfo({
        mpClip: null,
        mpItemSoundbite: null,
        fallbackClip: clip,
      })
    ).toBe(false);

    expect(
      shouldEmbedShowChapterInfo({
        mpClip: null,
        mpItemSoundbite: null,
        fallbackItemSoundbite: soundbite,
      })
    ).toBe(false);
  });
});
