/**
 * Self-tests for the fake `HTMLMediaElement` harness. The orchestration tests
 * for `MediaPlayerControllerAV` rely on this fake being accurate, so these
 * cases lock its observable contract.
 *
 * Matrix-level scenarios for the player itself live in
 * `apps/web/src/components/MediaPlayer/Controller/__tests__/`.
 */
import { afterEach, beforeEach, describe, expect, it } from 'vitest';

import {
  createMediaElementFakeRef,
  type InstalledMediaElementFake,
  installMediaElementFake,
  MediaElementFake,
} from './mediaElementFake';

describe('MediaElementFake (standalone)', () => {
  it('records every currentTime write in order', () => {
    const fake = new MediaElementFake();
    fake.currentTime = 5;
    fake.currentTime = 10;
    fake.currentTime = 0;

    expect(fake.getCurrentTimeWrites()).toEqual([5, 10, 0]);
  });

  it('records src, volume, muted, and playbackRate writes', () => {
    const fake = new MediaElementFake();
    fake.src = 'https://example.com/audio.mp3';
    fake.volume = 0.5;
    fake.muted = true;
    fake.playbackRate = 1.5;

    const log = fake.getEventLog();
    expect(log).toEqual(
      expect.arrayContaining([
        expect.objectContaining({ kind: 'set-src', value: 'https://example.com/audio.mp3' }),
        expect.objectContaining({ kind: 'set-volume', value: 0.5 }),
        expect.objectContaining({ kind: 'set-muted', value: true }),
        expect.objectContaining({ kind: 'set-playbackRate', value: 1.5 }),
      ])
    );
  });

  it('fireLoadedMetadata sets duration, bumps readyState, and dispatches the event', () => {
    const fake = new MediaElementFake();
    let received = false;
    fake.addEventListener('loadedmetadata', () => {
      received = true;
    });

    fake.fireLoadedMetadata(123);

    expect(fake.duration).toBe(123);
    expect(fake.readyState).toBeGreaterThanOrEqual(1);
    expect(received).toBe(true);
  });

  it('fireTimeUpdate updates currentTime and dispatches the event', () => {
    const fake = new MediaElementFake();
    let observedTime: number | null = null;
    fake.addEventListener('timeupdate', () => {
      observedTime = fake.currentTime;
    });

    fake.fireTimeUpdate(42);

    expect(fake.currentTime).toBe(42);
    expect(observedTime).toBe(42);
  });

  it('play() flips paused to false and dispatches `play`', async () => {
    const fake = new MediaElementFake();
    let received = false;
    fake.addEventListener('play', () => {
      received = true;
    });

    await fake.play();

    expect(fake.paused).toBe(false);
    expect(received).toBe(true);
  });

  it('pause() flips paused to true and dispatches `pause`', () => {
    const fake = new MediaElementFake({ paused: false });
    let received = false;
    fake.addEventListener('pause', () => {
      received = true;
    });

    fake.pause();

    expect(fake.paused).toBe(true);
    expect(received).toBe(true);
  });

  it('assertSeekedTo passes for the last write and fails when no writes exist', () => {
    const fake = new MediaElementFake();
    expect(() => fake.assertSeekedTo(0)).toThrow(/no currentTime writes recorded/);

    fake.currentTime = 7;
    fake.assertSeekedTo(7);

    fake.currentTime = 12;
    fake.assertSeekedTo(12);
  });

  it('assertNeverSeeked passes when no writes happen and fails otherwise', () => {
    const fake = new MediaElementFake();
    fake.assertNeverSeeked();

    fake.currentTime = 3;
    expect(() => fake.assertNeverSeeked()).toThrow(/1 writes/);
  });

  it('createMediaElementFakeRef returns a structurally-compatible audio/video ref', () => {
    const { current, fake } = createMediaElementFakeRef({ readyState: 4, duration: 99 });
    expect(current.readyState).toBe(4);
    expect(current.duration).toBe(99);

    current.currentTime = 25;
    expect(fake.getCurrentTimeWrites()).toEqual([25]);
  });
});

describe('installMediaElementFake (DOM decorator)', () => {
  let audio: HTMLAudioElement;
  let installed: InstalledMediaElementFake;

  beforeEach(() => {
    audio = document.createElement('audio');
    document.body.appendChild(audio);
    installed = installMediaElementFake(audio);
  });

  afterEach(() => {
    installed.uninstall();
    audio.remove();
  });

  it('records currentTime writes on the underlying DOM element', () => {
    audio.currentTime = 13;
    audio.currentTime = 26;

    expect(installed.getCurrentTimeWrites()).toEqual([13, 26]);
  });

  it('fireLoadedMetadata makes duration readable and dispatches the event to addEventListener listeners', () => {
    let observedDuration: number | null = null;
    audio.addEventListener('loadedmetadata', () => {
      observedDuration = audio.duration;
    });

    installed.fireLoadedMetadata(456);

    expect(audio.duration).toBe(456);
    expect(observedDuration).toBe(456);
  });

  it('fireTimeUpdate updates currentTime visible to listeners and is not recorded as a controller-initiated seek', () => {
    audio.currentTime = 1;
    installed.resetEventLog();

    let observedTime: number | null = null;
    audio.addEventListener('timeupdate', () => {
      observedTime = audio.currentTime;
    });

    installed.fireTimeUpdate(50);

    expect(audio.currentTime).toBe(50);
    expect(observedTime).toBe(50);
    expect(installed.getCurrentTimeWrites()).toEqual([]);
  });

  it('play() / pause() emit synthetic events without throwing', async () => {
    const playSeen: boolean[] = [];
    const pauseSeen: boolean[] = [];
    audio.addEventListener('play', () => playSeen.push(true));
    audio.addEventListener('pause', () => pauseSeen.push(true));

    await audio.play();
    audio.pause();

    expect(playSeen.length).toBe(1);
    expect(pauseSeen.length).toBe(1);
  });

  it('uninstall restores DOM behavior so subsequent tests see a clean element', () => {
    audio.currentTime = 10;
    installed.uninstall();

    audio.currentTime = 20;
    expect(installed.getCurrentTimeWrites()).toEqual([10]);
  });
});
