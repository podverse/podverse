import { renderHook, waitFor } from '@testing-library/react';
import type { MutableRefObject } from 'react';
import { describe, expect, it } from 'vitest';

import type { PlaybackLoadDecision } from '../../lib/playback';
import { createMediaElementFakeRef } from '../../test/mediaElementFake';
import { useMediaElementBridge } from '../useMediaElementBridge';

function decision(over: Partial<PlaybackLoadDecision> = {}): PlaybackLoadDecision {
  return {
    initialSeekSeconds: 0,
    shouldAutoPlay: false,
    shouldClearAutoQueue: false,
    shouldRecordPlaybackStat: false,
    reason: 'item-podcast-fresh',
    ...over,
  };
}

describe('useMediaElementBridge', () => {
  it('loadAndStart sets src, waits for loadedmetadata, seeks, and plays', async () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 0 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() => useMediaElementBridge(mediaRef, {}));
    const bridge = result.current;

    const p = bridge.loadAndStart(
      { kind: 'file', src: 'https://example.com/a.mp3' },
      decision({ initialSeekSeconds: 12, shouldAutoPlay: true })
    );

    expect(fake.src).toContain('a.mp3');
    fake.fireLoadedMetadata(120);
    await p;

    expect(fake.currentTime).toBe(12);
    expect(fake.paused).toBe(false);
  });

  it('second loadAndStart replaces first; in-flight token abandons first decision', async () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 0 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() => useMediaElementBridge(mediaRef, {}));
    const bridge = result.current;

    const p1 = bridge.loadAndStart(
      { kind: 'file', src: 'https://example.com/first.mp3' },
      decision({ initialSeekSeconds: 5, shouldAutoPlay: false })
    );
    const p2 = bridge.loadAndStart(
      { kind: 'file', src: 'https://example.com/second.mp3' },
      decision({ initialSeekSeconds: 99, shouldAutoPlay: false })
    );

    fake.fireLoadedMetadata(200);
    await Promise.all([p1, p2]);

    expect(fake.src).toContain('second.mp3');
    const seeks = fake.getCurrentTimeWrites();
    expect(seeks[seeks.length - 1]).toBe(99);
  });

  it('pauseAt arms boundary and pauses on timeupdate', async () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 2, duration: 100 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() => useMediaElementBridge(mediaRef, {}));
    const bridge = result.current;

    fake.fireLoadedMetadata(100);
    await bridge.play();
    bridge.pauseAt(50);
    fake.fireTimeUpdate(49);
    expect(fake.paused).toBe(false);
    fake.fireTimeUpdate(51);
    await waitFor(() => {
      expect(fake.paused).toBe(true);
    });
  });

  it('pauseAndDisarmBoundary pauses immediately and clears armed pauseAt', async () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 2, duration: 100 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() => useMediaElementBridge(mediaRef, {}));
    const bridge = result.current;

    fake.fireLoadedMetadata(100);
    await bridge.play();
    bridge.pauseAt(50);
    bridge.pauseAndDisarmBoundary();
    expect(fake.paused).toBe(true);

    await bridge.play();
    fake.fireTimeUpdate(60);
    expect(fake.paused).toBe(false);
  });

  it('runs armed pauseAt before onTimeUpdate so disarm in callback cannot skip boundary pause', async () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 2, duration: 100 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() =>
      useMediaElementBridge(mediaRef, {
        onTimeUpdate: () => {
          result.current.pauseAt(-1);
        },
      })
    );
    const bridge = result.current;

    fake.fireLoadedMetadata(100);
    await bridge.play();
    bridge.pauseAt(50);
    fake.fireTimeUpdate(51);

    await waitFor(() => {
      expect(fake.paused).toBe(true);
    });
  });

  it('seek and jumpBy mutate currentTime', () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 1, duration: 60 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() => useMediaElementBridge(mediaRef, {}));
    const bridge = result.current;

    fake.fireLoadedMetadata(60);
    bridge.seek(10);
    expect(fake.currentTime).toBe(10);
    expect(bridge.jumpBy(5)).toBe(15);
    expect(fake.currentTime).toBe(15);
  });

  it('togglePlay pauses when not paused', async () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 2, duration: 60 });
    const mediaRef: MutableRefObject<HTMLMediaElement | null> = { current };

    const { result } = renderHook(() => useMediaElementBridge(mediaRef, {}));
    const bridge = result.current;

    fake.fireLoadedMetadata(60);
    await bridge.play();
    expect(fake.paused).toBe(false);
    await bridge.togglePlay();
    expect(fake.paused).toBe(true);
  });
});
