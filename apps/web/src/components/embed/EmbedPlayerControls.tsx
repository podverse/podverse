'use client';

import { PlaybackSpeedButton } from '../MediaPlayer/Buttons/PlaybackSpeedButton';
import { PlayButton } from '../MediaPlayer/Buttons/PlayButton';
import { MediaPlayerProgress } from '../MediaPlayer/Sliders/MediaPlayerProgress';

import styles from '../../styles/components/embed/EmbedPlayerControls.module.scss';

export function EmbedPlayerControls() {
  return (
    <div className={styles.controls} data-testid="embed-player-controls">
      <div className={styles.progressRow}>
        <MediaPlayerProgress layoutVariant="embed" />
      </div>
      <div className={styles.transportRow}>
        <PlaybackSpeedButton />
        <PlayButton />
      </div>
    </div>
  );
}
