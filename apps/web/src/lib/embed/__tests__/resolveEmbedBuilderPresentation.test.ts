import { describe, expect, it } from 'vitest';

import {
  resolveDefaultMediaPreferenceForPlayerSize,
  resolveEmbedBuilderPresentation,
} from '../resolveEmbedBuilderPresentation';

describe('resolveEmbedBuilderPresentation', () => {
  it('maps builder types to layout, player size, and default media preference', () => {
    expect(resolveEmbedBuilderPresentation('short')).toEqual({
      layout: 'single',
      playerSize: 'short',
      mediaPreference: 'audio',
    });
    expect(resolveEmbedBuilderPresentation('tall')).toEqual({
      layout: 'single',
      playerSize: 'tall',
      mediaPreference: 'video',
    });
    expect(resolveEmbedBuilderPresentation('short-list')).toEqual({
      layout: 'list',
      playerSize: 'short',
      mediaPreference: 'audio',
    });
    expect(resolveEmbedBuilderPresentation('tall-list')).toEqual({
      layout: 'list',
      playerSize: 'tall',
      mediaPreference: 'video',
    });
  });
});

describe('resolveDefaultMediaPreferenceForPlayerSize', () => {
  it('returns audio for short and video for tall', () => {
    expect(resolveDefaultMediaPreferenceForPlayerSize('short')).toBe('audio');
    expect(resolveDefaultMediaPreferenceForPlayerSize('tall')).toBe('video');
  });
});
