import { describe, expect, it } from 'vitest';

import { resolveEffectiveEmbedListPlayerSize } from '../resolvePlayerSizeFromPresentation';

describe('resolveEffectiveEmbedListPlayerSize', () => {
  it('keeps short shell when player size is locked to short regardless of preference', () => {
    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'short',
        playerSizeLocked: true,
        mediaPreference: 'video',
      })
    ).toBe('short');
  });

  it('keeps tall shell when player size is locked to tall regardless of preference', () => {
    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'tall',
        playerSizeLocked: true,
        mediaPreference: 'audio',
      })
    ).toBe('tall');
  });

  it('derives shell size from media preference when player size is not locked', () => {
    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'short',
        playerSizeLocked: false,
        mediaPreference: 'video',
      })
    ).toBe('tall');

    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'short',
        playerSizeLocked: false,
        mediaPreference: 'audio',
      })
    ).toBe('short');
  });
});
