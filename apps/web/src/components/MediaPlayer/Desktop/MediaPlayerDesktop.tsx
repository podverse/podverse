import { MediaPlayerButtonsDesktop } from './MediaPlayerButtonsDesktop';
import { MediaPlayerControlsDesktop } from './MediaPlayerControlsDesktop';
import { MediaPlayerInfoDesktop } from './MediaPlayerInfoDesktop';
import { MediaPlayerMarqueeDesktop } from './MediaPlayerMarqueeDesktop';

import styles from '../../../styles/components/MediaPlayer/Desktop/MediaPlayerDesktop.module.scss';

export const MediaPlayerDesktop = () => {
  return (
    <div className={styles.playerDesktop}>
      <MediaPlayerMarqueeDesktop />
      <div className={styles.bottomSection}>
        <MediaPlayerInfoDesktop />
        <MediaPlayerControlsDesktop />
        <MediaPlayerButtonsDesktop />
      </div>
    </div>
  );
};
