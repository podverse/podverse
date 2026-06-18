import { FaForwardStep } from 'react-icons/fa6';

import { useTrackNextButtonActions } from '../../../hooks/useTrackNextButtonActions';

import styles from '../../../styles/components/MediaPlayer/Buttons/TrackNextButton.module.scss';

export const TrackNextButton = () => {
  const { hasEpisodeChaptersForTrackButtons, onClick, longPressProps } =
    useTrackNextButtonActions();

  return (
    <button
      className={styles.trackNextButton}
      onClick={onClick}
      {...(hasEpisodeChaptersForTrackButtons ? longPressProps : {})}
      type="button"
    >
      <FaForwardStep />
    </button>
  );
};
