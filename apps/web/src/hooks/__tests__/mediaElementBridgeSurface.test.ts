import { beforeEach, describe, expect, it, vi } from 'vitest';

import {
  applyItemEnclosureSurfaceChangeFromRef,
  attachNonLiveHlsPlayback,
} from '../mediaElementBridgeSurface';

const hlsJs = vi.hoisted(() => ({
  attachMedia: vi.fn(),
  isSupported: vi.fn(() => true),
  loadSource: vi.fn(),
}));

vi.mock('hls.js', () => ({
  default: class Hls {
    static isSupported(): boolean {
      return hlsJs.isSupported();
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
  });
});
