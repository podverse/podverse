import { describe, expect, it } from 'vitest';

import {
  normalizeCurrentSource,
  normalizeLiveWindow,
  normalizeProgressEvent,
} from './liveWindowNormalization';

describe('normalizeProgressEvent', () => {
  it('reads a progress event without live fields as not live', () => {
    expect(normalizeProgressEvent({ positionSeconds: 1, durationSeconds: 50 })).toEqual({
      positionSeconds: 1,
      durationSeconds: 50,
      isLive: false,
      liveWindow: null,
    });
  });

  it('forces a live progress event duration to 0 and keeps a valid window', () => {
    expect(
      normalizeProgressEvent({
        positionSeconds: 20,
        durationSeconds: 40,
        isLive: true,
        liveWindow: { startSeconds: 12, liveEdgeSeconds: 80 },
      })
    ).toEqual({
      positionSeconds: 20,
      durationSeconds: 0,
      isLive: true,
      liveWindow: { startSeconds: 12, liveEdgeSeconds: 80 },
    });
  });

  it('reads a live progress event with no window as live with no window', () => {
    const expected = {
      positionSeconds: 8,
      durationSeconds: 0,
      isLive: true,
      liveWindow: null,
    };
    expect(
      normalizeProgressEvent({
        positionSeconds: 8,
        durationSeconds: 15,
        isLive: true,
        liveWindow: null,
      })
    ).toEqual(expected);
    expect(
      normalizeProgressEvent({
        positionSeconds: 8,
        durationSeconds: 15,
        isLive: true,
      })
    ).toEqual(expected);
  });

  it('reads a malformed window on a live progress event as live with no window', () => {
    expect(
      normalizeProgressEvent({
        positionSeconds: 1,
        durationSeconds: 9,
        isLive: true,
        liveWindow: { startSeconds: 8, liveEdgeSeconds: 3 },
      })
    ).toEqual({
      positionSeconds: 1,
      durationSeconds: 0,
      isLive: true,
      liveWindow: null,
    });
  });

  it('drops a window on a progress event that is not live', () => {
    expect(
      normalizeProgressEvent({
        positionSeconds: 4,
        durationSeconds: 90,
        isLive: false,
        liveWindow: { startSeconds: 0, liveEdgeSeconds: 30 },
      })
    ).toEqual({
      positionSeconds: 4,
      durationSeconds: 90,
      isLive: false,
      liveWindow: null,
    });
  });
});

describe('normalizeLiveWindow', () => {
  it('returns a fresh object for a valid window', () => {
    const raw = { startSeconds: 2, liveEdgeSeconds: 9 };
    const window = normalizeLiveWindow(raw);
    expect(window).toEqual({ startSeconds: 2, liveEdgeSeconds: 9 });
    expect(window).not.toBe(raw);
  });

  it('keeps a zero-length window', () => {
    expect(normalizeLiveWindow({ startSeconds: 4, liveEdgeSeconds: 4 })).toEqual({
      startSeconds: 4,
      liveEdgeSeconds: 4,
    });
  });

  it('drops a window that is not a finite span', () => {
    expect(normalizeLiveWindow(null)).toBeNull();
    expect(normalizeLiveWindow(undefined)).toBeNull();
    expect(normalizeLiveWindow(4)).toBeNull();
    expect(normalizeLiveWindow('1-9')).toBeNull();
    expect(normalizeLiveWindow({ startSeconds: 1 })).toBeNull();
    expect(normalizeLiveWindow({ liveEdgeSeconds: 2 })).toBeNull();
    expect(normalizeLiveWindow({ startSeconds: Number.NaN, liveEdgeSeconds: 2 })).toBeNull();
    expect(normalizeLiveWindow({ startSeconds: 1, liveEdgeSeconds: Number.NaN })).toBeNull();
    expect(
      normalizeLiveWindow({ startSeconds: Number.POSITIVE_INFINITY, liveEdgeSeconds: 2 })
    ).toBeNull();
    expect(
      normalizeLiveWindow({ startSeconds: 1, liveEdgeSeconds: Number.POSITIVE_INFINITY })
    ).toBeNull();
    expect(normalizeLiveWindow({ startSeconds: 5, liveEdgeSeconds: 4 })).toBeNull();
  });
});

describe('normalizeCurrentSource', () => {
  it('returns null for a missing current source', () => {
    expect(normalizeCurrentSource(null)).toBeNull();
  });

  it('forces a live current source duration to 0 and keeps a valid window', () => {
    expect(
      normalizeCurrentSource({
        url: 'https://example.test/live.m3u8',
        meta: null,
        positionSeconds: 30,
        durationSeconds: 120,
        isPlaying: false,
        isLive: true,
        liveWindow: { startSeconds: 10, liveEdgeSeconds: 100 },
      })
    ).toEqual({
      url: 'https://example.test/live.m3u8',
      meta: null,
      positionSeconds: 30,
      durationSeconds: 0,
      isPlaying: false,
      isLive: true,
      liveWindow: { startSeconds: 10, liveEdgeSeconds: 100 },
    });
  });

  it('keeps a non-live current source duration and drops a window', () => {
    expect(
      normalizeCurrentSource({
        url: 'https://example.test/ep.mp3',
        meta: null,
        positionSeconds: 5,
        durationSeconds: 60,
        isLive: false,
        liveWindow: { startSeconds: 0, liveEdgeSeconds: 60 },
      })
    ).toEqual({
      url: 'https://example.test/ep.mp3',
      meta: null,
      positionSeconds: 5,
      durationSeconds: 60,
      isLive: false,
      liveWindow: null,
    });
  });
});
