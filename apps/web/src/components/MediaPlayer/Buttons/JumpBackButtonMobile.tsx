'use client';

import { useTranslations } from 'next-intl';
import { FaRotateLeft } from 'react-icons/fa6';

import { MEDIA_JUMP_BACK_SECONDS } from '@podverse/helpers';

import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/JumpBackButtonMobile.module.scss';

export const JumpBackButtonMobile = () => {
  const { jumpBy } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');

  const handleClick = () => {
    const t = jumpBy(-MEDIA_JUMP_BACK_SECONDS);
    setMPCurrentTime(t);
  };

  return (
    <button
      className={styles.jumpBackButtonMobile}
      aria-label={tMediaPlayer('jump_back', { seconds: MEDIA_JUMP_BACK_SECONDS })}
      onClick={handleClick}
      type="button"
    >
      <FaRotateLeft aria-hidden />
    </button>
  );
};
