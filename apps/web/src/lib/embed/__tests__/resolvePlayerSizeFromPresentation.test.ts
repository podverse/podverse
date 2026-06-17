import { describe, expect, it } from 'vitest';

import { resolveEffectiveEmbedListPlayerSize } from '../resolvePlayerSizeFromPresentation';

describe('resolveEffectiveEmbedListPlayerSize', () => {
  it('keeps compact shell when player size is locked to compact regardless of preference', () => {
    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'compact',
        playerSizeLocked: true,
        mediaPreference: 'video',
      })
    ).toBe('compact');
  });

  it('keeps responsive shell when player size is locked to responsive regardless of preference', () => {
    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'responsive',
        playerSizeLocked: true,
        mediaPreference: 'audio',
      })
    ).toBe('responsive');
  });

  it('derives shell size from media preference when player size is not locked', () => {
    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'compact',
        playerSizeLocked: false,
        mediaPreference: 'video',
      })
    ).toBe('responsive');

    expect(
      resolveEffectiveEmbedListPlayerSize({
        playerSize: 'compact',
        playerSizeLocked: false,
        mediaPreference: 'audio',
      })
    ).toBe('compact');
  });
});
