import { describe, expect, it } from 'vitest';

import {
  resolveDefaultMediaPreferenceForPlayerSize,
  resolveEmbedBuilderPresentation,
} from '../resolveEmbedBuilderPresentation';

describe('resolveEmbedBuilderPresentation', () => {
  it('maps player size and list toggle to layout, player size, and default media preference', () => {
    expect(resolveEmbedBuilderPresentation({ playerSize: 'compact', listEnabled: false })).toEqual({
      layout: 'single',
      playerSize: 'compact',
      mediaPreference: 'audio',
    });
    expect(
      resolveEmbedBuilderPresentation({ playerSize: 'responsive', listEnabled: false })
    ).toEqual({
      layout: 'single',
      playerSize: 'responsive',
      mediaPreference: 'video',
    });
    expect(resolveEmbedBuilderPresentation({ playerSize: 'compact', listEnabled: true })).toEqual({
      layout: 'list',
      playerSize: 'compact',
      mediaPreference: 'audio',
    });
    expect(
      resolveEmbedBuilderPresentation({ playerSize: 'responsive', listEnabled: true })
    ).toEqual({
      layout: 'list',
      playerSize: 'responsive',
      mediaPreference: 'video',
    });
  });
});

describe('resolveDefaultMediaPreferenceForPlayerSize', () => {
  it('returns audio for compact and video for responsive', () => {
    expect(resolveDefaultMediaPreferenceForPlayerSize('compact')).toBe('audio');
    expect(resolveDefaultMediaPreferenceForPlayerSize('responsive')).toBe('video');
  });
});
