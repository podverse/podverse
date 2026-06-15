import { describe, expect, it } from 'vitest';

import type { DTOClip, DTOItemSoundbite } from '@podverse/helpers';

import { shouldEmbedShowChapterInfo } from '../shouldEmbedShowChapterInfo';

const clip = { id_text: 'clip-1' } as DTOClip;
const soundbite = { id_text: 'sb-1' } as DTOItemSoundbite;

describe('shouldEmbedShowChapterInfo', () => {
  it('returns true for episode-only playback', () => {
    expect(
      shouldEmbedShowChapterInfo({
        clip: null,
        itemSoundbite: null,
      })
    ).toBe(true);
  });

  it('returns false when a clip is active', () => {
    expect(
      shouldEmbedShowChapterInfo({
        clip,
        itemSoundbite: null,
      })
    ).toBe(false);
  });

  it('returns false when a soundbite is active', () => {
    expect(
      shouldEmbedShowChapterInfo({
        clip: null,
        itemSoundbite: soundbite,
      })
    ).toBe(false);
  });

  it('returns true when segment refs are cleared after playback end', () => {
    expect(
      shouldEmbedShowChapterInfo({
        clip: null,
        itemSoundbite: null,
      })
    ).toBe(true);
  });
});
