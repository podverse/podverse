'use client';

import { useTranslations } from 'next-intl';
import { FaScissors } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';

import styles from '../../../styles/components/MediaPlayer/Buttons/ClipButton.module.scss';

export const ClipButton = () => {
  const { mpChannel, mpItem } = useMediaPlayer();
  const { setModalClip } = useModals();
  const tFeatures = useTranslations('features');

  const onClick = () => {
    setModalClip({
      channel: mpChannel,
      item: mpItem,
    });
  };

  return (
    <button
      className={styles.clipButton}
      aria-label={tFeatures('clip.create_clip')}
      data-testid="media-player-clip-button"
      onClick={onClick}
      type="button"
    >
      <FaScissors aria-hidden />
    </button>
  );
};
