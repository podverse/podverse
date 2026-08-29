'use client';

import { useTranslations } from 'next-intl';
import { FaForwardStep } from 'react-icons/fa6';

import { useTrackNextButtonActions } from '../../../hooks/useTrackNextButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackNextButton.module.scss';

export const TrackNextButton = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackNextButtonActions();
  const tMediaPlayer = useTranslations('media_player');

  return (
    <button
      className={styles.trackNextButton}
      aria-label={tMediaPlayer('skip_to_next')}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaForwardStep aria-hidden />
    </button>
  );
};
