import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyItemEnclosureSurfaceChangeFromRef,
  attachNonLiveHlsPlayback,
  detachNonLiveHlsPlayback,
  mediaElementHasPlayableSource,
  readManagedHlsLiveSyncPosition,
  waitForPlayableMediaSource,
} from '../mediaElementBridgeSurface';

const hlsJs = vi.hoisted(() => ({
  attachMedia: vi.fn(),
  isSupported: vi.fn(() => true),
  liveSyncPosition: vi.fn((): number | null => null),
  loadSource: vi.fn(),
}));

vi.mock('hls.js', () => ({
  default: class Hls {
    static isSupported(): boolean {
      return hlsJs.isSupported();
    }

    get liveSyncPosition(): number | null {
      return hlsJs.liveSyncPosition();
    }

    loadSource(url: string): void {
      hlsJs.loadSource(url);
    }

    attachMedia(element: HTMLMediaElement): void {
      hlsJs.attachMedia(element);
    }

    destroy(): void {
      return undefined;
    }
  },
}));

function hlsPlaylistMedia(canPlayTypeResult: string): {
  load: ReturnType<typeof vi.fn>;
  media: HTMLMediaElement;
} {
  const load = vi.fn();
  const media = {
    src: '',
    canPlayType: () => canPlayTypeResult,
    load,
    removeAttribute(name: string) {
      if (name === 'src') {
        media.src = '';
      }
    },
  };
  // Surface helpers take HTMLMediaElement. This double only implements the members they call.
  return { load, media: media as unknown as HTMLMediaElement };
}

beforeEach(() => {
  hlsJs.attachMedia.mockClear();
  hlsJs.isSupported.mockReset();
  hlsJs.isSupported.mockReturnValue(true);
  hlsJs.liveSyncPosition.mockReset();
  hlsJs.liveSyncPosition.mockReturnValue(null);
  hlsJs.loadSource.mockClear();
});

describe('applyItemEnclosureSurfaceChangeFromRef', () => {
  it('does not rewind currentTime when reloading the active enclosure surface', () => {
    const media = {
      currentTime: 83,
      load: vi.fn(),
      pause: vi.fn(),
      removeAttribute: vi.fn(),
    } as unknown as HTMLMediaElement;

    applyItemEnclosureSurfaceChangeFromRef(
      { current: media },
      {
        treatAsActiveNonLiveFile: true,
        shouldPlayWhenReady: false,
        onPlayedShouldPlayClear: () => undefined,
      }
    );

    expect(media.currentTime).toBe(83);
    expect(media.load).toHaveBeenCalledTimes(1);
  });

  it('does not reload an HLS playlist the element attachment owns', () => {
    const media = {
      currentTime: 12,
      load: vi.fn(),
      pause: vi.fn(),
      removeAttribute: vi.fn(),
    } as unknown as HTMLMediaElement;

    applyItemEnclosureSurfaceChangeFromRef(
      { current: media },
      {
        hlsPlaylistAttachment: true,
        treatAsActiveNonLiveFile: true,
        shouldPlayWhenReady: false,
        onPlayedShouldPlayClear: () => undefined,
      }
    );

    expect(media.load).not.toHaveBeenCalled();
  });

  it('does not reload the element while hls.js owns the HLS playlist', async () => {
    const { load, media } = hlsPlaylistMedia('');
    await attachNonLiveHlsPlayback(media, 'https://cdn.example/live.m3u8?token=1');
    load.mockClear();

    applyItemEnclosureSurfaceChangeFromRef(
      { current: media },
      {
        treatAsActiveNonLiveFile: true,
        shouldPlayWhenReady: false,
        onPlayedShouldPlayClear: () => undefined,
      }
    );

    expect(load).not.toHaveBeenCalled();
  });
});

describe('attachNonLiveHlsPlayback', () => {
  it('sets the HLS playlist URL when the element can play HLS', async () => {
    const { media } = hlsPlaylistMedia('maybe');
    await attachNonLiveHlsPlayback(media, 'https://cdn.example/live.m3u8?token=1');

    expect(media.src).toBe('https://cdn.example/live.m3u8?token=1');
    expect(hlsJs.loadSource).not.toHaveBeenCalled();
  });

  it('attaches hls.js and leaves src unset when the element cannot play an HLS playlist', async () => {
    const { media } = hlsPlaylistMedia('');
    await attachNonLiveHlsPlayback(media, 'https://cdn.example/ep.m3u8');

    expect(media.src).toBe('');
    expect(hlsJs.loadSource).toHaveBeenCalledWith('https://cdn.example/ep.m3u8');
    expect(hlsJs.attachMedia).toHaveBeenCalledWith(media);
    expect(mediaElementHasPlayableSource(media)).toBe(true);
  });

  it('waits until a file URL or a managed HLS attachment is present', async () => {
    vi.useFakeTimers();
    try {
      const media = { src: '', currentSrc: '' } as HTMLMediaElement;
      const pending = waitForPlayableMediaSource(
        () => media,
        () => false,
        1000,
        50
      );
      media.src = 'http://localhost:2111/e2e/audio/a.mp3';
      await vi.advanceTimersByTimeAsync(50);
      await expect(pending).resolves.toBe(true);

      const empty = { src: '', currentSrc: '' } as HTMLMediaElement;
      const timedOut = waitForPlayableMediaSource(
        () => empty,
        () => false,
        1000,
        50
      );
      await vi.advanceTimersByTimeAsync(1000);
      await expect(timedOut).resolves.toBe(false);
    } finally {
      vi.useRealTimers();
    }
  });
});

describe('readManagedHlsLiveSyncPosition', () => {
  it('reports the hls.js live sync position until the element is detached', async () => {
    hlsJs.liveSyncPosition.mockReturnValue(72);
    const { media } = hlsPlaylistMedia('');
    await attachNonLiveHlsPlayback(media, 'https://cdn.example/live.m3u8');

    expect(readManagedHlsLiveSyncPosition(media)).toBe(72);

    hlsJs.liveSyncPosition.mockReturnValue(Number.NaN);
    expect(readManagedHlsLiveSyncPosition(media)).toBeNull();

    hlsJs.liveSyncPosition.mockReturnValue(72);
    detachNonLiveHlsPlayback(media);
    expect(readManagedHlsLiveSyncPosition(media)).toBeNull();
  });

  it('reports null for an element that plays HLS natively', async () => {
    hlsJs.liveSyncPosition.mockReturnValue(72);
    const { media } = hlsPlaylistMedia('maybe');
    await attachNonLiveHlsPlayback(media, 'https://cdn.example/live.m3u8');

    expect(readManagedHlsLiveSyncPosition(media)).toBeNull();
  });
});
