'use client';

import { useTranslations } from 'next-intl';
import { FaChevronLeft } from 'react-icons/fa6';

import { MEDIA_JUMP_INCREMENT_SECONDS } from '@podverse/helpers';

import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/IncrementBackButton.module.scss';

export const IncrementBackButton = () => {
  const { jumpBy } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');

  const handleClick = () => {
    const t = jumpBy(-MEDIA_JUMP_INCREMENT_SECONDS);
    setMPCurrentTime(t);
  };

  return (
    <button
      className={styles.incrementBackButton}
      aria-label={tMediaPlayer('step_back')}
      onClick={handleClick}
      type="button"
    >
      <FaChevronLeft aria-hidden />
    </button>
  );
};
