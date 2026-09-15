import { describe, expect, it } from 'vitest';

import {
  playbackEventFromBackgroundTransition,
  playbackEventFromDiscreteSignal,
  playbackEventFromProgressSample,
  shouldClaimActiveQueueForPlaybackEvent,
  shouldPostNowPlayingImmediately,
} from './playbackEventSource';

describe('playbackEventSource', () => {
  it('maps discrete playback signals directly to event kinds', () => {
    expect(playbackEventFromDiscreteSignal('play')).toBe('play');
    expect(playbackEventFromDiscreteSignal('pause')).toBe('pause');
    expect(playbackEventFromDiscreteSignal('seek')).toBe('seek');
    expect(playbackEventFromDiscreteSignal('skip')).toBe('skip');
    expect(playbackEventFromDiscreteSignal('complete')).toBe('complete');
    expect(playbackEventFromDiscreteSignal('sleep_timer_stop')).toBe('sleep_timer_stop');
    expect(playbackEventFromDiscreteSignal('queue_add')).toBe('queue_add');
    expect(playbackEventFromDiscreteSignal('queue_remove')).toBe('queue_remove');
    expect(playbackEventFromDiscreteSignal('queue_reorder')).toBe('queue_reorder');
  });

  it('never constructs progress events while paused or backgrounded paused', () => {
    expect(playbackEventFromProgressSample({ isPlaying: false })).toBeNull();
    expect(playbackEventFromBackgroundTransition({ isPlaying: false })).toBeNull();
  });

  it('classifies playing progress and background flush as progress_tick', () => {
    expect(playbackEventFromProgressSample({ isPlaying: true })).toBe('progress_tick');
    expect(playbackEventFromBackgroundTransition({ isPlaying: true })).toBe('progress_tick');
  });

  it('posts discrete position events immediately and only claims active queue on play', () => {
    expect(shouldPostNowPlayingImmediately('play')).toBe(true);
    expect(shouldPostNowPlayingImmediately('pause')).toBe(true);
    expect(shouldPostNowPlayingImmediately('seek')).toBe(true);
    expect(shouldPostNowPlayingImmediately('skip')).toBe(true);
    expect(shouldPostNowPlayingImmediately('complete')).toBe(true);
    expect(shouldPostNowPlayingImmediately('sleep_timer_stop')).toBe(true);
    expect(shouldPostNowPlayingImmediately('progress_tick')).toBe(false);
    expect(shouldClaimActiveQueueForPlaybackEvent('play')).toBe(true);
    expect(shouldClaimActiveQueueForPlaybackEvent('progress_tick')).toBe(false);
  });
});
