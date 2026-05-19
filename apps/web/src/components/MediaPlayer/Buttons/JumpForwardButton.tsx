'use client';

import { FaRotateRight } from 'react-icons/fa6';

import { MEDIA_JUMP_FORWARD_SECONDS } from '@podverse/helpers';

import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/JumpForwardButton.module.scss';

export const JumpForwardButton = () => {
  const { jumpBy } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();

  const handleClick = () => {
    const t = jumpBy(MEDIA_JUMP_FORWARD_SECONDS);
    setMPCurrentTime(t);
  };

  return (
    <button className={styles.jumpForwardButton} onClick={handleClick} type="button">
      <FaRotateRight />
    </button>
  );
};
