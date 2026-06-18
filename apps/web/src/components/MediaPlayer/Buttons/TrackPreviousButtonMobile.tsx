import { FaBackwardStep } from 'react-icons/fa6';

import { useTrackPreviousButtonActions } from '../../../hooks/useTrackPreviousButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackPreviousButtonMobile.module.scss';

export const TrackPreviousButtonMobile = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackPreviousButtonActions();

  return (
    <button
      className={styles.trackPreviousButtonMobile}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaBackwardStep />
    </button>
  );
};
