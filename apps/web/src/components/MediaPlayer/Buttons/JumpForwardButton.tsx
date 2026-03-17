import { FaRotateRight } from 'react-icons/fa6';

import { MEDIA_JUMP_FORWARD_SECONDS } from '@podverse/helpers';

import { EVENTS } from '../../../constants/events';

import styles from '../../../styles/components/MediaPlayer/Buttons/JumpForwardButton.module.scss';

export const JumpForwardButton = () => {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent(EVENTS.MEDIA_PLAYER.JUMP_FORWARD, {
        detail: { seconds: MEDIA_JUMP_FORWARD_SECONDS },
      })
    );
  };

  return (
    <button className={styles.jumpForwardButton} onClick={handleClick} type="button">
      <FaRotateRight />
    </button>
  );
};
