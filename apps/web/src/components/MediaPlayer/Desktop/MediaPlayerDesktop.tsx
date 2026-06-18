import { MediaPlayerButtonsDesktop } from './MediaPlayerButtonsDesktop';
import { MediaPlayerControlsDesktop } from './MediaPlayerControlsDesktop';
import { MediaPlayerInfoDesktop } from './MediaPlayerInfoDesktop';

import styles from '../../../styles/components/MediaPlayer/Desktop/MediaPlayerDesktop.module.scss';

export const MediaPlayerDesktop = () => {
  return (
    <div className={styles.playerDesktop}>
      <div className={styles.bottomSection}>
        <MediaPlayerInfoDesktop />
        <MediaPlayerControlsDesktop />
        <MediaPlayerButtonsDesktop />
      </div>
    </div>
  );
};
