import { render } from '@testing-library/react';
import type { RefObject } from 'react';
import { beforeEach, describe, expect, it, vi } from 'vitest';

import { attachNonLiveHlsPlayback } from '../../../hooks/mediaElementBridgeSurface';
import { MediaElement } from './MediaElement';

vi.mock('../../../hooks/mediaElementBridgeSurface', () => ({
  attachNonLiveHlsPlayback: vi.fn(async () => undefined),
  detachNonLiveHlsPlayback: vi.fn(),
}));

beforeEach(() => {
  vi.clearAllMocks();
});

function mediaRef(): RefObject<HTMLMediaElement | null> {
  return { current: null };
}

describe('MediaElement', () => {
  it('sets src for a progressive file', () => {
    const { container } = render(
      <MediaElement
        isVideo={false}
        mediaRef={mediaRef()}
        source={{ kind: 'file', src: 'https://cdn.example/ep.mp3', delivery: 'file' }}
      />
    );

    expect(container.querySelector('audio')?.getAttribute('src')).toBe(
      'https://cdn.example/ep.mp3'
    );
    expect(attachNonLiveHlsPlayback).not.toHaveBeenCalled();
  });

  it('omits src for an HLS playlist and attaches playback after mount', () => {
    const { container } = render(
      <MediaElement
        isVideo={false}
        mediaRef={mediaRef()}
        source={{
          delivery: 'hls',
          kind: 'file',
          mimeType: 'application/vnd.apple.mpegurl',
          src: 'https://cdn.example/live.m3u8?token=1',
        }}
      />
    );

    expect(container.querySelector('audio')?.hasAttribute('src')).toBe(false);
    expect(attachNonLiveHlsPlayback).toHaveBeenCalledWith(
      expect.any(HTMLAudioElement),
      'https://cdn.example/live.m3u8?token=1'
    );
  });
});
