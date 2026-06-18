import { FaBackwardStep } from 'react-icons/fa6';

import { useTrackPreviousButtonActions } from '../../../hooks/useTrackPreviousButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackPreviousButton.module.scss';

export const TrackPreviousButton = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackPreviousButtonActions();

  return (
    <button
      className={styles.trackPreviousButton}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaBackwardStep />
    </button>
  );
};
