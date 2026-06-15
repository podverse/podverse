'use client';

import { useTranslations } from 'next-intl';
import { FaWaveSquare } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';

import styles from '../../../styles/components/MediaPlayer/Buttons/AlternateEnclosureButton.module.scss';

export const AlternateEnclosureButton = () => {
  const { mpItem, mpItemLabeledItemEnclosures } = useMediaPlayer();
  const { setModalSourceSelector } = useModals();
  const tMediaPlayer = useTranslations('media_player');

  if (mpItemLabeledItemEnclosures.length <= 1) {
    return null;
  }

  const onClick = () => {
    setModalSourceSelector({
      labeledItemEnclosures: mpItemLabeledItemEnclosures,
      actionType: 'load-in-player',
      itemTitle: mpItem?.title ?? null,
    });
  };

  return (
    <button
      className={styles.alternateEnclosureButton}
      aria-label={tMediaPlayer('source.select_source')}
      data-testid="media-player-alternate-enclosure-button"
      onClick={onClick}
      type="button"
    >
      <FaWaveSquare aria-hidden />
    </button>
  );
};
