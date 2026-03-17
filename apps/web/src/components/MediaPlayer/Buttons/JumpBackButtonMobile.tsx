import { FaRotateLeft } from 'react-icons/fa6';

import { MEDIA_JUMP_BACK_SECONDS } from '@podverse/helpers';

import { EVENTS } from '../../../constants/events';

import styles from '../../../styles/components/MediaPlayer/Buttons/JumpBackButtonMobile.module.scss';

export const JumpBackButtonMobile = () => {
  const handleClick = () => {
    window.dispatchEvent(
      new CustomEvent(EVENTS.MEDIA_PLAYER.JUMP_BACK, {
        detail: { seconds: MEDIA_JUMP_BACK_SECONDS },
      })
    );
  };

  return (
    <button className={styles.jumpBackButtonMobile} onClick={handleClick} type="button">
      <FaRotateLeft />
    </button>
  );
};
