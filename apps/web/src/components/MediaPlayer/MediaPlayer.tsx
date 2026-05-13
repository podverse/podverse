'use client';

/**
 * Behavior contract for the entire media player tree lives in
 * `apps/web/src/components/MediaPlayer/MEDIA-PLAYER-DECISION-MATRIX.md`.
 * That matrix is the regression oracle for any change inside this directory,
 * inside `Controller/`, and inside the queue/auto-queue hooks that feed it.
 * Update the matrix alongside production changes; orchestration tests under
 * `Controller/__tests__/` execute it as a contract.
 */

import { useEffect } from 'react';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { updateLayoutForMediaPlayer } from '../../utils/mediaPlayer/mediaPlayerLayout';
import { MediaPlayerDesktop } from './Desktop/MediaPlayerDesktop';
import { MediaPlayerMobile } from './Mobile/MediaPlayerMobile';
import { MediaPlayerModal } from './Modal/MediaPlayerModal';

import styles from '../../styles/components/MediaPlayer/MediaPlayer.module.scss';

export const MediaPlayer = () => {
  const { mpChannel, mpAddByRSS } = useMediaPlayer();

  // Sync layout when this component mounts (e.g. after lazy load) or when playing state changes.
  // This ensures the "reserve space" CSS is only applied once the player UI is ready to display.
  useEffect(() => {
    updateLayoutForMediaPlayer(!!mpChannel || !!mpAddByRSS);
  }, [mpChannel, mpAddByRSS]);

  return (
    <aside id="media-player" className={styles.player}>
      <MediaPlayerDesktop />
      <MediaPlayerMobile />
      <MediaPlayerModal />
    </aside>
  );
};
