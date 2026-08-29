'use client';

import { useTranslations } from 'next-intl';
import { FaBackwardStep } from 'react-icons/fa6';

import { useTrackPreviousButtonActions } from '../../../hooks/useTrackPreviousButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.module.scss';

export const TrackPreviousButtonMobile = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackPreviousButtonActions();
  const tMediaPlayer = useTranslations('media_player');

  return (
    <button
      className={styles.trackPreviousButtonMobile}
      aria-label={tMediaPlayer('skip_to_previous')}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaBackwardStep aria-hidden />
    </button>
  );
};
