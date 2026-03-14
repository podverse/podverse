'use client';

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
