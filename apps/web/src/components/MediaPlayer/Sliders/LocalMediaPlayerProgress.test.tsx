import { cleanup, fireEvent, render, screen } from '@testing-library/react';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { LocalMediaPlayerProgress } from './MediaPlayerProgress';

const { seek, setMPCurrentTime, setMPDuration, readDurationSeconds, mediaPlayerState } = vi.hoisted(
  () => ({
    seek: vi.fn(),
    setMPCurrentTime: vi.fn(),
    setMPDuration: vi.fn(),
    readDurationSeconds: vi.fn((): number | null | undefined => undefined),
    mediaPlayerState: {
      mpClip: null,
      mpItemSoundbite: null,
      mpItemChapter: null,
      mpItemChapters: [] as unknown[],
      mpDuration: 100,
      setMPDuration: vi.fn(),
    },
  })
);

vi.mock('../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => mediaPlayerState,
}));

vi.mock('../../../contexts/MediaPlayerControls', () => ({
  useMediaPlayerControls: () => ({ seek, readDurationSeconds }),
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
    setMPDuration.mockClear();
    mediaPlayerState.setMPDuration = setMPDuration;
    readDurationSeconds.mockReset();
    readDurationSeconds.mockReturnValue(undefined);
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

  it('seeks using the loaded file duration when player state still has another length', () => {
    readDurationSeconds.mockReturnValue(200);
    render(<LocalMediaPlayerProgress />);

    const slider = screen.getByTestId('media-player-local-progress');
    mockBarRect(slider);

    fireEvent.mouseDown(slider, { clientX: 100 });
    fireEvent.mouseUp(window);

    expect(seek).toHaveBeenCalledTimes(1);
    expect(seek).toHaveBeenCalledWith(100);
    expect(setMPDuration).toHaveBeenCalledWith(200);
  });
});
