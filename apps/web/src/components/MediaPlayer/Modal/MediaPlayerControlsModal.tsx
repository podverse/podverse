import { useRemotePlayerDisplay } from '../../../hooks/useRemotePlayerDisplay';
import { useShowJumpButtons } from '../../../hooks/useShowJumpButtons';
import { JumpBackButton } from '../Buttons/JumpBackButton';
import { JumpForwardButton } from '../Buttons/JumpForwardButton';
import { PlayButton } from '../Buttons/PlayButton';
import { TrackNextButton } from '../Buttons/TrackNextButton';
import { TrackPreviousButton } from '../Buttons/TrackPreviousButton';
import { RemoteLiveLabel } from '../CrossDevice/RemoteLiveLabel';
import { MediaPlayerProgress } from '../Sliders/MediaPlayerProgress';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerControlsModal.module.scss';

export const MediaPlayerControlsModal = () => {
  const remote = useRemotePlayerDisplay();
  const showTrackPrevious = remote === null || remote.controls.canTrackPrevious;
  const showTrackNext = remote === null || remote.controls.canTrackNext;
  const showJumpButtons = useShowJumpButtons();
  const showProgress = remote === null || remote.controls.showsProgress;

  return (
    <div className={styles.controls}>
      <div className={styles.progressSection}>
        {showProgress ? <MediaPlayerProgress includeMobileTime /> : <RemoteLiveLabel />}
      </div>
      <div className={styles.butttonsSection}>
        {showTrackPrevious && <TrackPreviousButton />}
        {showJumpButtons && <JumpBackButton />}
        <PlayButton />
        {showJumpButtons && <JumpForwardButton />}
        {showTrackNext && <TrackNextButton />}
      </div>
    </div>
  );
};
