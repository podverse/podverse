'use client';

import { useTranslations } from 'next-intl';
import { FaPause, FaPlay } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlayButtonMobile.module.scss';

export const PlayButtonMobile = () => {
  const { mpIsPlaying, setMPIsPlaying } = useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');
  const icon = mpIsPlaying ? <FaPause aria-hidden /> : <FaPlay aria-hidden />;

  const handleClick = () => {
    setMPIsPlaying(!mpIsPlaying);
  };

  return (
    <button
      className={styles.playButtonMobile}
      aria-label={mpIsPlaying ? tMediaPlayer('pause') : tMediaPlayer('play')}
      data-media-player-playing={mpIsPlaying ? 'true' : undefined}
      onClick={handleClick}
      type="button"
    >
      {icon}
    </button>
  );
};
