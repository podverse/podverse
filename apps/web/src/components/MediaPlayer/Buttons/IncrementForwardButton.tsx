'use client';

import { useTranslations } from 'next-intl';
import { FaChevronRight } from 'react-icons/fa6';

import { MEDIA_JUMP_INCREMENT_SECONDS } from '@podverse/helpers';

import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/IncrementForwardButton.module.scss';

export const IncrementForwardButton = () => {
  const { jumpBy } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');

  const handleClick = () => {
    const t = jumpBy(MEDIA_JUMP_INCREMENT_SECONDS);
    setMPCurrentTime(t);
  };

  return (
    <button
      className={styles.incrementForwardButton}
      aria-label={tMediaPlayer('step_forward')}
      onClick={handleClick}
      type="button"
    >
      <FaChevronRight aria-hidden />
    </button>
  );
};
