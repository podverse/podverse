'use client';

import { useTranslations } from 'next-intl';
import { FaRotateRight } from 'react-icons/fa6';

import { MEDIA_JUMP_FORWARD_SECONDS } from '@podverse/helpers';

import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/JumpForwardButtonMobile.module.scss';

export const JumpForwardButtonMobile = () => {
  const { jumpBy } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();
  const tMediaPlayer = useTranslations('media_player');

  const handleClick = () => {
    const t = jumpBy(MEDIA_JUMP_FORWARD_SECONDS);
    setMPCurrentTime(t);
  };

  return (
    <button
      className={styles.jumpForwardButtonMobile}
      aria-label={tMediaPlayer('jump_forward', { seconds: MEDIA_JUMP_FORWARD_SECONDS })}
      onClick={handleClick}
      type="button"
    >
      <FaRotateRight aria-hidden />
    </button>
  );
};
