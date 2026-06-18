import { FaForwardStep } from 'react-icons/fa6';

import { useTrackNextButtonActions } from '../../../hooks/useTrackNextButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackNextButtonMobile.module.scss';

export const TrackNextButtonMobile = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackNextButtonActions();

  return (
    <button
      className={styles.trackNextButtonMobile}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaForwardStep />
    </button>
  );
};
