import { describe, expect, it } from 'vitest';

import type { PlaybackLocalStateValue } from './playbackOutbox';
import {
  eventKindEmitsRemovalTombstone,
  mergePlaybackLocalState,
  selectPlaybackOutboxEvictions,
  shouldCollapsePlaybackEvent,
  shouldCollapseQueueReorderEvent,
  shouldEnqueuePlaybackEvent,
  toPlaybackLocalStateValue,
  toReplayOccurredAtIso,
} from './playbackOutbox';

const at = (iso: string): number => Date.parse(iso);

const localState = (partial: Partial<PlaybackLocalStateValue>): PlaybackLocalStateValue => ({
  completed: false,
  lastMeaningfulAt: at('2026-09-13T12:00:00.000Z'),
  mediaFileDuration: null,
  playbackPosition: 0,
  zone: 'now_playing',
  ...partial,
});

describe('playback outbox policy', () => {
  it('refuses a progress tick while paused at enqueue', () => {
    expect(shouldEnqueuePlaybackEvent({ eventKind: 'progress_tick', isPlaying: false })).toBe(
      false
    );
    expect(shouldEnqueuePlaybackEvent({ eventKind: 'progress_tick', isPlaying: true })).toBe(true);
    expect(shouldEnqueuePlaybackEvent({ eventKind: 'pause', isPlaying: false })).toBe(true);
  });

  it('collapses consecutive position-only events and keeps complete as a discrete boundary', () => {
    expect(
      shouldCollapsePlaybackEvent({
        incomingEventKind: 'progress_tick',
        sameResourceTailEventKind: 'seek',
      })
    ).toBe(true);
    expect(
      shouldCollapsePlaybackEvent({
        incomingEventKind: 'progress_tick',
        sameResourceTailEventKind: 'complete',
      })
    ).toBe(false);
  });

  it('collapses successive queue_reorder events for one queue only', () => {
    expect(shouldCollapseQueueReorderEvent('queue_reorder', true)).toBe(true);
    expect(shouldCollapseQueueReorderEvent('queue_reorder', false)).toBe(false);
    expect(shouldCollapseQueueReorderEvent('queue_add', true)).toBe(false);
  });

  it('evicts position-only rows before discrete events when enforcing the cap', () => {
    const candidates = [
      { id: 1, eventKind: 'play' as const },
      { id: 2, eventKind: 'progress_tick' as const },
      { id: 3, eventKind: 'seek' as const },
      { id: 4, eventKind: 'complete' as const },
    ];

    expect(selectPlaybackOutboxEvictions(candidates, 3)).toEqual([2]);
    expect(selectPlaybackOutboxEvictions(candidates, 2)).toEqual([2, 3]);
  });

  it('falls back to oldest discrete events once position-only rows are exhausted', () => {
    const candidates = [
      { id: 1, eventKind: 'play' as const },
      { id: 2, eventKind: 'pause' as const },
      { id: 3, eventKind: 'complete' as const },
      { id: 4, eventKind: 'skip' as const },
    ];

    expect(selectPlaybackOutboxEvictions(candidates, 2)).toEqual([2, 1]);
  });

  it('treats zone moves as non-removals and queue_remove as the only tombstone source', () => {
    expect(eventKindEmitsRemovalTombstone('play')).toBe(false);
    expect(eventKindEmitsRemovalTombstone('complete')).toBe(false);
    expect(eventKindEmitsRemovalTombstone('skip')).toBe(false);
    expect(eventKindEmitsRemovalTombstone('queue_remove')).toBe(true);
  });

  it('keeps enqueue timestamps in device time and applies clock offset only at replay build time', () => {
    const occurredAt = at('2026-09-13T12:00:00.000Z');
    const state = toPlaybackLocalStateValue({
      completed: false,
      eventKind: 'play',
      mediaFileDuration: 100,
      occurredAt,
      playbackPosition: 45,
    });

    expect(state.lastMeaningfulAt).toBe(occurredAt);
    expect(toReplayOccurredAtIso(occurredAt, 2000)).toBe('2026-09-13T11:59:58.000Z');
  });

  it('keeps zone by newer timestamp while still moving position forward', () => {
    const existing = localState({
      lastMeaningfulAt: at('2026-09-13T12:05:00.000Z'),
      playbackPosition: 240,
      zone: 'now_playing',
    });
    const incomingOlder = localState({
      lastMeaningfulAt: at('2026-09-13T12:00:00.000Z'),
      playbackPosition: 300,
      zone: 'history',
    });

    expect(mergePlaybackLocalState(existing, incomingOlder)).toEqual(
      localState({
        lastMeaningfulAt: at('2026-09-13T12:05:00.000Z'),
        playbackPosition: 300,
        zone: 'now_playing',
      })
    );
  });
});
