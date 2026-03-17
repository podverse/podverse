import { FaChevronRight } from 'react-icons/fa6';

import { MEDIA_JUMP_INCREMENT_SECONDS } from '@podverse/helpers';

import { EVENTS } from '../../../constants/events';

import styles from '../../../styles/components/MediaPlayer/Buttons/IncrementForwardButton.module.scss';

export const IncrementForwardButton = () => {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent(EVENTS.MEDIA_PLAYER.JUMP_FORWARD, {
        detail: { seconds: MEDIA_JUMP_INCREMENT_SECONDS },
      })
    );
  };

  return (
    <button className={styles.incrementForwardButton} onClick={handleClick} type="button">
      <FaChevronRight />
    </button>
  );
};
