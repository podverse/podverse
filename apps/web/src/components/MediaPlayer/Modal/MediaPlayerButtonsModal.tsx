import { MediumEnum } from '@podverse/helpers';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useQueues } from '../../../contexts/Queue';
import { ClipButton } from '../Buttons/ClipButton';
import { PlaylistAddToButton } from '../Buttons/PlaylistAddToButton';
import { RepeatButton } from '../Buttons/RepeatButton';
import { SettingsButton } from '../Buttons/SettingsButton';
import { ShuffleButton } from '../Buttons/ShuffleButton';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerButtonsModal.module.scss';

export const MediaPlayerButtonsModal = () => {
  const { mpAddByRSS } = useMediaPlayer();
  const { activeQueue } = useQueues();
  const medium_id = activeQueue?.medium_id || MediumEnum.AV;

  return (
    <div className={styles.buttons}>
      <div className={styles.startSection}>
        <PlaylistAddToButton />
        {medium_id === MediumEnum.AV && !mpAddByRSS && <ClipButton />}
        <RepeatButton />
        <ShuffleButton />
        <SettingsButton />
      </div>
    </div>
  );
};
