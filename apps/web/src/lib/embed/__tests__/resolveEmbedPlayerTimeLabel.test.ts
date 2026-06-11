import { describe, expect, it } from 'vitest';

import {
  EMBED_PLAYER_UNKNOWN_TIME_DISPLAY,
  resolveEmbedPlayerTimeLabel,
} from '../resolveEmbedPlayerTimeLabel';

describe('resolveEmbedPlayerTimeLabel', () => {
  it('shows duration when playback is at position 0 and duration is known', () => {
    expect(resolveEmbedPlayerTimeLabel(0, 6702)).toBe('1:51:42');
  });

  it('shows current position when playback has started', () => {
    expect(resolveEmbedPlayerTimeLabel(125, 6702)).toBe('2:05');
  });

  it('shows unknown placeholder when duration is not available at position 0', () => {
    expect(resolveEmbedPlayerTimeLabel(0, 0)).toBe(EMBED_PLAYER_UNKNOWN_TIME_DISPLAY);
  });

  it('shows current position even when duration is unknown', () => {
    expect(resolveEmbedPlayerTimeLabel(42, 0)).toBe('0:42');
  });
});
