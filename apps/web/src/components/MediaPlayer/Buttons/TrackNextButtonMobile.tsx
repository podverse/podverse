'use client';

import { useTranslations } from 'next-intl';
import { FaForwardStep } from 'react-icons/fa6';

import { useTrackNextButtonActions } from '../../../hooks/useTrackNextButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackNextButtonMobile.module.scss';

export const TrackNextButtonMobile = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackNextButtonActions();
  const tMediaPlayer = useTranslations('media_player');

  return (
    <button
      className={styles.trackNextButtonMobile}
      aria-label={tMediaPlayer('skip_to_next')}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaForwardStep aria-hidden />
    </button>
  );
};
