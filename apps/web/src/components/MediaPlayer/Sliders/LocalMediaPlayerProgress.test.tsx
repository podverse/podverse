import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalMediaPlayerProgress } from './MediaPlayerProgress';

const { seek, setMPCurrentTime, mediaPlayerState } = vi.hoisted(() => ({
  seek: vi.fn(),
  setMPCurrentTime: vi.fn(),
  mediaPlayerState: {
    mpClip: null,
    mpItemSoundbite: null,
    mpItemChapter: null,
    mpItemChapters: [] as unknown[],
    mpDuration: 100,
  },
}));

vi.mock('../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => mediaPlayerState,
}));

vi.mock('../../../contexts/MediaPlayerControls', () => ({
  useMediaPlayerControls: () => ({ seek }),
}));

vi.mock('../../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({
    mpCurrentTime: 5,
    setMPCurrentTime,
  }),
}));

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

describe('LocalMediaPlayerProgress', () => {
  beforeEach(() => {
    seek.mockClear();
    setMPCurrentTime.mockClear();
    mediaPlayerState.mpDuration = 100;
  });

  afterEach(() => {
    cleanup();
  });

  it('seeks once on mouseup after a drag with several moves', () => {
    render(<LocalMediaPlayerProgress />);

    const slider = screen.getByTestId('media-player-local-progress');
    mockBarRect(slider);

    fireEvent.mouseDown(slider, { clientX: 20 });
    fireEvent.mouseMove(window, { clientX: 80 });
    fireEvent.mouseMove(window, { clientX: 140 });
    fireEvent.mouseMove(window, { clientX: 150 });

    expect(seek).not.toHaveBeenCalled();
    expect(setMPCurrentTime).not.toHaveBeenCalled();

    fireEvent.mouseUp(window);

    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(75);
    expect(setMPCurrentTime).toHaveBeenCalledTimes(1);
    expect(setMPCurrentTime).toHaveBeenCalledWith(75);
  });

  it('seeks once on a tap that never moves', () => {
    render(<LocalMediaPlayerProgress />);

    const slider = screen.getByTestId('media-player-local-progress');
    mockBarRect(slider);

    fireEvent.mouseDown(slider, { clientX: 100 });
    fireEvent.mouseUp(window);

    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(50);
    expect(setMPCurrentTime).toHaveBeenCalledWith(50);
  });
});
