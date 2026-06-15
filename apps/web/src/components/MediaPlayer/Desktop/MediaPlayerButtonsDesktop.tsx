import { MediumEnum } from '@podverse/helpers';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useQueues } from '../../../contexts/Queue';
import { AlternateEnclosureButton } from '../Buttons/AlternateEnclosureButton';
import { ClipButton } from '../Buttons/ClipButton';
import { MuteButton } from '../Buttons/MuteButton';
import { PlaylistAddToButton } from '../Buttons/PlaylistAddToButton';
import { RepeatButton } from '../Buttons/RepeatButton';
import { SettingsButton } from '../Buttons/SettingsButton';
import { ShuffleButton } from '../Buttons/ShuffleButton';
import { VolumeSlider } from '../Sliders/VolumeSlider';

import styles from '../../../styles/components/MediaPlayer/Desktop/MediaPlayerButtonsDesktop.module.scss';

export const MediaPlayerButtonsDesktop = () => {
  const { mpAddByRSS } = useMediaPlayer();
  const { activeQueue } = useQueues();
  const medium_id = activeQueue?.medium_id || MediumEnum.AV;

  return (
    <div className={styles.buttons}>
      <div className={styles.startSection}>
        <AlternateEnclosureButton />
        <PlaylistAddToButton />
        {medium_id === MediumEnum.AV && !mpAddByRSS && <ClipButton />}
        <RepeatButton />
        <ShuffleButton />
        <SettingsButton />
      </div>
      <div className={styles.endSection}>
        <VolumeSlider />
        <MuteButton />
      </div>
    </div>
  );
};
