import { describe, expect, it } from 'vitest';

import { isMeaningfulPlaybackEvent, resolveZoneForEvent } from './playbackEvents.js';

describe('isMeaningfulPlaybackEvent', () => {
  it('treats progress ticks as meaningful only while playing', () => {
    expect(isMeaningfulPlaybackEvent('progress_tick', { isPlaying: true })).toBe(true);
    expect(isMeaningfulPlaybackEvent('progress_tick', { isPlaying: false })).toBe(false);
    expect(isMeaningfulPlaybackEvent('progress_tick', {})).toBe(false);
  });
});

describe('resolveZoneForEvent', () => {
  it('keeps sleep timer stops in now playing', () => {
    expect(resolveZoneForEvent('sleep_timer_stop')).toBe('now_playing');
  });
});
