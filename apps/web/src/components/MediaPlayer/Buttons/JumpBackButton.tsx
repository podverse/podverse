'use client';

import { FaRotateLeft } from 'react-icons/fa6';

import { MEDIA_JUMP_BACK_SECONDS } from '@podverse/helpers';

import { useMediaPlayerControls } from '../../../contexts/MediaPlayerControls';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/JumpBackButton.module.scss';

export const JumpBackButton = () => {
  const { jumpBy } = useMediaPlayerControls();
  const { setMPCurrentTime } = useMediaPlayerCurrentTime();

  const handleClick = () => {
    const t = jumpBy(-MEDIA_JUMP_BACK_SECONDS);
    setMPCurrentTime(t);
  };

  return (
    <button className={styles.jumpBackButton} onClick={handleClick} type="button">
      <FaRotateLeft />
    </button>
  );
};
