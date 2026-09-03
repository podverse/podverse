'use client';

import { useTranslations } from 'next-intl';
import { FaVolumeHigh, FaVolumeXmark } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';

import styles from '../../../styles/components/MediaPlayer/Buttons/MuteButton.module.scss';

export const MuteButton = () => {
  const { mpIsMuted, setMPIsMuted } = useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');
  const button = mpIsMuted ? <FaVolumeXmark aria-hidden /> : <FaVolumeHigh aria-hidden />;

  return (
    <button
      className={styles.muteButton}
      aria-label={mpIsMuted ? tMediaPlayer('unmute') : tMediaPlayer('mute')}
      aria-pressed={mpIsMuted}
      onClick={() => setMPIsMuted(!mpIsMuted)}
      type="button"
    >
      {button}
    </button>
  );
};
