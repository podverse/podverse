import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import type { LivePlaybackDisplay } from '@podverse/playback-core';

import { LiveMediaPlayerProgress } from './LiveMediaPlayerProgress';

const { displayRef, goToLive, seekToFraction } = vi.hoisted(() => {
  const atLiveEdge: LivePlaybackDisplay = {
    isAtLiveEdge: true,
    behindLiveSeconds: 0,
    behindLiveLabel: null,
    canRewind: false,
    windowFraction: null,
  };
  return {
    displayRef: { current: atLiveEdge },
    goToLive: vi.fn(),
    seekToFraction: vi.fn(),
  };
});

vi.mock('next-intl', () => ({
  useTranslations: (namespace: string) => (key: string, values?: Record<string, unknown>) => {
    if (namespace === 'media' && key === 'livestream.live') {
      return 'Live';
    }
    if (namespace === 'media_player' && key === 'go_to_live') {
      return 'Go to Live';
    }
    if (namespace === 'media_player' && key === 'seek') {
      return 'Seek';
    }
    if (namespace === 'media_player' && key === 'behind_live') {
      const time = typeof values?.time === 'string' ? values.time : '';
      return `${time} Behind Live`;
    }
    return key;
  },
}));

vi.mock('../../../hooks/useLiveMediaSnapshot', () => ({
  useLiveMediaSnapshot: () => ({
    attached: true,
    display: displayRef.current,
  }),
}));

vi.mock('../../../hooks/usePlayerTransport', () => ({
  usePlayerTransport: () => ({
    goToLive,
  }),
}));

vi.mock('../../../lib/livePlayback/liveMediaStore', () => ({
  liveMediaStore: {
    seekToFraction,
  },
}));

const atLiveEdge: LivePlaybackDisplay = {
  isAtLiveEdge: true,
  behindLiveSeconds: 0,
  behindLiveLabel: null,
  canRewind: false,
  windowFraction: null,
};

function mockBarRect(el: HTMLElement): void {
  vi.spyOn(el, 'getBoundingClientRect').mockReturnValue({
    x: 0,
    y: 0,
    top: 0,
    left: 0,
    bottom: 20,
    right: 200,
    width: 200,
    height: 20,
    toJSON: () => ({}),
  });
}

describe('LiveMediaPlayerProgress', () => {
  beforeEach(() => {
    displayRef.current = { ...atLiveEdge };
    goToLive.mockClear();
    seekToFraction.mockClear();
  });

  afterEach(() => {
    cleanup();
  });

  it('shows one Live control and hides rewind when the window cannot rewind', () => {
    render(<LiveMediaPlayerProgress layoutVariant="default" />);

    expect(screen.getAllByRole('button', { name: 'Go to Live' })).toHaveLength(1);
    const control = screen.getByRole('button', { name: 'Go to Live' });
    expect(control.textContent).toBe('Live');
    expect(control.getAttribute('data-at-live-edge')).toBe('true');
    expect(screen.queryByTestId('media-player-live-scrubber')).toBeNull();
    expect(screen.queryByTestId('media-player-live-behind')).toBeNull();
    expect(screen.queryByText(/Behind Live/)).toBeNull();
  });

  it('shows the behind-live time and a scrubber on a rewindable window', () => {
    displayRef.current = {
      isAtLiveEdge: false,
      behindLiveSeconds: 65,
      behindLiveLabel: '\u22121:05',
      canRewind: true,
      windowFraction: 0.42,
    };

    render(<LiveMediaPlayerProgress layoutVariant="default" />);

    expect(screen.getByTestId('media-player-live-behind').textContent).toBe('\u22121:05');
    expect(screen.getByText('1:05 Behind Live').textContent).toBe('1:05 Behind Live');
    expect(screen.getByTestId('media-player-live-scrubber').getAttribute('aria-valuenow')).toBe(
      '42'
    );
  });

  it('seeks once on mouseup after a press-plus-move', () => {
    displayRef.current = {
      isAtLiveEdge: false,
      behindLiveSeconds: 65,
      behindLiveLabel: '\u22121:05',
      canRewind: true,
      windowFraction: 0.42,
    };

    render(<LiveMediaPlayerProgress layoutVariant="default" />);

    const scrubber = screen.getByTestId('media-player-live-scrubber');
    mockBarRect(scrubber);

    fireEvent.mouseDown(scrubber, { clientX: 40 });
    fireEvent.mouseMove(window, { clientX: 100 });
    fireEvent.mouseMove(window, { clientX: 160 });

    expect(seekToFraction).not.toHaveBeenCalled();

    fireEvent.mouseUp(window);

    expect(seekToFraction).toHaveBeenCalledTimes(1);
    expect(seekToFraction).toHaveBeenCalledWith(0.8);
  });

  it('goes to live when the Live control is pressed', () => {
    render(<LiveMediaPlayerProgress layoutVariant="default" />);

    fireEvent.click(screen.getByRole('button', { name: 'Go to Live' }));

    expect(goToLive).toHaveBeenCalledTimes(1);
  });

  it('renders a static Live label on the narrow bar when the window cannot rewind', () => {
    render(<LiveMediaPlayerProgress layoutVariant="edge" />);

    expect(screen.queryByRole('button', { name: 'Go to Live' })).toBeNull();
    expect(screen.getByTestId('media-player-live-edge-label').textContent).toBe('Live');
  });
});
