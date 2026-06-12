'use client';

import { useTranslations } from 'next-intl';
import { FaWaveSquare } from 'react-icons/fa6';

import styles from '../../styles/components/embed/EmbedAlternateEnclosureButton.module.scss';

type EmbedAlternateEnclosureButtonProps = {
  onOpen: () => void;
};

export function EmbedAlternateEnclosureButton({ onOpen }: EmbedAlternateEnclosureButtonProps) {
  const tMediaPlayer = useTranslations('media_player');

  return (
    <button
      className={styles.alternateEnclosureButton}
      aria-label={tMediaPlayer('source.select_source')}
      data-testid="embed-player-alternate-enclosure-button"
      onClick={onOpen}
      type="button"
    >
      <FaWaveSquare aria-hidden />
    </button>
  );
}
