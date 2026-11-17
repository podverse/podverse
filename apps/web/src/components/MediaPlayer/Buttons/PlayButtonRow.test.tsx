import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, it, vi } from 'vitest';

import type { DTOItem } from '@podverse/helpers';

import { PlayButtonRow } from './PlayButtonRow';

const { mediaPlayerState } = vi.hoisted(() => ({
  mediaPlayerState: {
    mpAddByRSS: null,
    mpClip: null,
    mpDuration: 100,
    mpIsPlaying: false,
    mpItem: null as DTOItem | null,
    mpItemChapter: null,
    mpItemSoundbite: null,
  },
}));

vi.mock('next-intl', () => ({
  useTranslations: () => (key: string) => key,
}));

vi.mock('../../../contexts/MediaPlayer', () => ({
  useMediaPlayer: () => mediaPlayerState,
}));

vi.mock('../../../contexts/MediaPlayerCurrentTime', () => ({
  useMediaPlayerCurrentTime: () => ({ mpCurrentTime: 10 }),
}));

vi.mock('../../../hooks/useRemoteRowPlayback', () => ({
  useRemoteRowPlayback: () => ({ isPlaying: false, showsProgress: false }),
}));

// PlayButtonRow reads id_text for the now-playing match and live_item for the livestream guard.
const item = {
  id: 7,
  id_text: 'ep-7',
  live_item: null,
} as DTOItem;

describe('PlayButtonRow completed', () => {
  afterEach(() => {
    cleanup();
    mediaPlayerState.mpItem = null;
    mediaPlayerState.mpIsPlaying = false;
  });

  it('renders the played check before the progress bar when the row is completed and playing', () => {
    mediaPlayerState.mpItem = item;
    mediaPlayerState.mpIsPlaying = true;

    render(
      <PlayButtonRow
        beforeProgress={<span>time</span>}
        completed
        item={item}
        onClick={() => undefined}
      />
    );

    const check = screen.getByTestId('play-button-row-completed');
    const progress = screen.getByTestId('play-button-row-progress');
    const meta = screen.getByTestId('play-button-row-meta');

    expect(check.getAttribute('aria-label')).toBe('history.played');
    expect(check.compareDocumentPosition(progress) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
    expect(meta.compareDocumentPosition(check) & Node.DOCUMENT_POSITION_FOLLOWING).toBe(
      Node.DOCUMENT_POSITION_FOLLOWING
    );
  });

  it('renders neither the check nor the progress bar when the row is not completed and idle', () => {
    render(<PlayButtonRow completed={false} item={item} onClick={() => undefined} />);

    expect(screen.queryByTestId('play-button-row-completed')).toBeNull();
    expect(screen.queryByTestId('play-button-row-progress')).toBeNull();
  });
});
