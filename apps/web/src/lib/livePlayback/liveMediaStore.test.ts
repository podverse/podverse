import { describe, expect, it, vi } from 'vitest';

import type { MediaSourceDelivery } from '@podverse/helpers';

import { createLiveMediaStore } from './liveMediaStore';
import type { SeekableRanges } from './liveSeekWindow';

function timeRanges(...ranges: Array<[number, number]>): SeekableRanges {
  const at = (index: number): [number, number] => {
    const range = ranges[index];
    if (range === undefined) {
      throw new RangeError(`No time range at ${index}`);
    }
    return range;
  };
  return {
    length: ranges.length,
    start: (index) => at(index)[0],
    end: (index) => at(index)[1],
  };
}

type FakeMediaState = {
  currentTime: number;
  paused: boolean;
  played: SeekableRanges;
  seekable: SeekableRanges;
};

/** A jsdom audio element whose position, pause state, and ranges the test sets. */
function createFakeMedia(initial: Partial<FakeMediaState> = {}): {
  media: HTMLMediaElement;
  state: FakeMediaState;
} {
  const state: FakeMediaState = {
    currentTime: 0,
    paused: true,
    played: timeRanges(),
    seekable: timeRanges(),
    ...initial,
  };
  const media = document.createElement('audio');
  Object.defineProperties(media, {
    currentTime: {
      configurable: true,
      get: () => state.currentTime,
      set: (value: number) => {
        state.currentTime = value;
      },
    },
    paused: { configurable: true, get: () => state.paused },
    played: { configurable: true, get: () => state.played },
    seekable: { configurable: true, get: () => state.seekable },
  });
  return { media, state };
}

function createHarness(initialLiveSyncPosition: number | null = null) {
  let liveSyncPosition = initialLiveSyncPosition;
  const intervals = new Map<number, () => void>();
  let nextIntervalId = 1;
  const store = createLiveMediaStore({
    readLiveSyncPosition: () => liveSyncPosition,
    setInterval: (fn) => {
      const id = nextIntervalId;
      nextIntervalId += 1;
      intervals.set(id, fn);
      return id;
    },
    clearInterval: (id) => {
      intervals.delete(id);
    },
  });
  return {
    store,
    intervals,
    setLiveSyncPosition: (value: number | null) => {
      liveSyncPosition = value;
    },
    tick: () => {
      for (const fn of intervals.values()) {
        fn();
      }
    },
  };
}

function registration(media: HTMLMediaElement, delivery: MediaSourceDelivery = 'hls') {
  return { media, delivery, reconnect: vi.fn() };
}

/** Rewindable HLS: window [0, 120] with hls.js placing the live edge at 102. */
const REWINDABLE_SYNC_POSITION = 102;

function playedAndPausedAt(seconds: number) {
  return createFakeMedia({
    currentTime: seconds,
    played: timeRanges([0, seconds]),
    seekable: timeRanges([0, 120]),
  });
}

describe('liveMediaStore', () => {
  it('attaches on register, replaces an earlier registration, and detaches on unregister', () => {
    const { store, intervals } = createHarness();
    const first = createFakeMedia();
    const second = createFakeMedia();

    const unregisterFirst = store.register(registration(first.media));
    expect(store.getSnapshot().attached).toBe(true);
    expect(intervals.size).toBe(1);

    const unregisterSecond = store.register(registration(second.media));
    expect(store.getSnapshot().attached).toBe(true);
    expect(intervals.size).toBe(1);

    unregisterFirst();
    expect(store.getSnapshot().attached).toBe(true);

    unregisterSecond();
    expect(store.getSnapshot().attached).toBe(false);
    expect(intervals.size).toBe(0);
    expect(store.readWindow()).toBeNull();
  });

  it('reads an element that has not played as at live', () => {
    const { store } = createHarness(REWINDABLE_SYNC_POSITION);
    const { media } = createFakeMedia({ currentTime: 60, seekable: timeRanges([0, 120]) });
    store.register(registration(media));

    expect(store.getSnapshot().display).toMatchObject({
      isAtLiveEdge: true,
      behindLiveSeconds: 0,
      behindLiveLabel: null,
    });
  });

  it('reads how far a played element sits behind the live edge', () => {
    const { store } = createHarness(REWINDABLE_SYNC_POSITION);
    const { media } = playedAndPausedAt(60);
    store.register(registration(media));

    expect(store.readWindow()).toEqual({ startSeconds: 0, liveEdgeSeconds: 102 });
    expect(store.getSnapshot().display).toMatchObject({
      isAtLiveEdge: false,
      behindLiveSeconds: 42,
      behindLiveLabel: '\u22120:42',
      canRewind: true,
    });
  });

  describe('prepareResume', () => {
    it('plays a fresh element, and a paused one the window still holds, in place', () => {
      const { store } = createHarness(REWINDABLE_SYNC_POSITION);
      const { media, state } = createFakeMedia({ currentTime: 60, seekable: timeRanges([0, 120]) });
      store.register(registration(media));

      expect(store.prepareResume(media)).toBe('play');
      expect(state.currentTime).toBe(60);

      state.played = timeRanges([0, 60]);
      expect(store.prepareResume(media)).toBe('play');
      expect(state.currentTime).toBe(60);
    });

    it('jumps to live when the paused position sits inside the window start margin', () => {
      const { store } = createHarness(REWINDABLE_SYNC_POSITION);
      const { media, state } = playedAndPausedAt(3);
      store.register(registration(media));

      expect(store.prepareResume(media)).toBe('play');
      expect(state.currentTime).toBe(102);
    });

    it('reconnects a progressive stream that played and paused', () => {
      const { store } = createHarness();
      const { media, state } = createFakeMedia({
        currentTime: 300,
        played: timeRanges([0, 300]),
        seekable: timeRanges([0, 300]),
      });
      const progressive = registration(media, 'file');
      store.register(progressive);

      expect(store.prepareResume(media)).toBe('reconnecting');
      expect(progressive.reconnect).toHaveBeenCalledTimes(1);
      expect(state.currentTime).toBe(300);
    });

    it('passes an element that is not registered straight to play', () => {
      const { store } = createHarness();
      const replaced = createFakeMedia({ currentTime: 300, played: timeRanges([0, 300]) });
      const replacedRegistration = registration(replaced.media, 'file');
      store.register(replacedRegistration);
      store.register(registration(createFakeMedia().media, 'file'));

      expect(store.prepareResume(replaced.media)).toBe('play');
      expect(replacedRegistration.reconnect).not.toHaveBeenCalled();
    });
  });

  it('goes to live by seeking HLS to the edge and by reconnecting a progressive stream', () => {
    const { store } = createHarness(REWINDABLE_SYNC_POSITION);
    const hls = playedAndPausedAt(60);
    store.register(registration(hls.media));

    store.goToLive();
    expect(hls.state.currentTime).toBe(102);
    expect(store.getSnapshot().display.isAtLiveEdge).toBe(true);

    const progressive = createFakeMedia({ currentTime: 300, played: timeRanges([0, 300]) });
    const progressiveRegistration = registration(progressive.media, 'file');
    store.register(progressiveRegistration);

    store.goToLive();
    expect(progressiveRegistration.reconnect).toHaveBeenCalledTimes(1);
    expect(progressive.state.currentTime).toBe(300);
  });

  it('seeks only inside a rewindable window, clamped to the start margin and the live edge', () => {
    const { store, setLiveSyncPosition } = createHarness(20);
    const { media, state } = createFakeMedia({
      currentTime: 15,
      played: timeRanges([0, 15]),
      seekable: timeRanges([0, 25]),
    });
    store.register(registration(media));

    store.seekTo(10);
    store.seekToFraction(0.5);
    store.jumpBy(-10);
    expect(state.currentTime).toBe(15);

    setLiveSyncPosition(REWINDABLE_SYNC_POSITION);
    state.seekable = timeRanges([0, 120]);
    state.currentTime = 60;

    store.seekTo(1);
    expect(state.currentTime).toBe(6);
    store.seekTo(200);
    expect(state.currentTime).toBe(102);
    store.seekToFraction(0);
    expect(state.currentTime).toBe(6);
    store.seekToFraction(0.5);
    expect(state.currentTime).toBe(51);
    store.jumpBy(-15);
    expect(state.currentTime).toBe(36);
    store.jumpBy(100);
    expect(state.currentTime).toBe(102);
  });

  it('measures the native HLS join offset on the first playing event only', () => {
    const { store } = createHarness(null);
    const { media, state } = createFakeMedia({ currentTime: 72, seekable: timeRanges([0, 90]) });
    store.register(registration(media));

    state.played = timeRanges([0, 72]);
    state.paused = false;
    media.dispatchEvent(new Event('playing'));
    expect(store.readWindow()).toEqual({ startSeconds: 0, liveEdgeSeconds: 72 });
    expect(store.getSnapshot().display.isAtLiveEdge).toBe(true);

    state.seekable = timeRanges([0, 100]);
    state.currentTime = 50;
    media.dispatchEvent(new Event('playing'));
    expect(store.readWindow()).toEqual({ startSeconds: 0, liveEdgeSeconds: 82 });
    expect(store.getSnapshot().display.behindLiveLabel).toBe('\u22120:32');
  });

  it('notifies only when a whole-second display value changes', () => {
    const { store, tick } = createHarness(REWINDABLE_SYNC_POSITION);
    const { media, state } = playedAndPausedAt(60);
    store.register(registration(media));
    const listener = vi.fn();
    store.subscribe(listener);
    const before = store.getSnapshot();

    state.currentTime = 59.99;
    store.refresh();
    expect(listener).not.toHaveBeenCalled();
    expect(store.getSnapshot()).toBe(before);

    state.currentTime = 59;
    tick();
    expect(listener).toHaveBeenCalledTimes(1);
    expect(store.getSnapshot().display.behindLiveSeconds).toBe(43);
  });
});
