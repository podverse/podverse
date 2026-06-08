'use client';

import { PlayButton } from '../MediaPlayer/Buttons/PlayButton';

import { EmbedPlayerMoreButton } from './EmbedPlayerMoreButton';
import { MediaPlayerProgress } from '../MediaPlayer/Sliders/MediaPlayerProgress';

import styles from '../../styles/components/embed/EmbedPlayerControls.module.scss';

export function EmbedPlayerControls() {
  return (
    <div className={styles.controls} data-testid="embed-player-controls">
      <div className={styles.progressRow}>
        <MediaPlayerProgress layoutVariant="embed" />
      </div>
      <div className={styles.transportRow} data-testid="embed-player-transport">
        <PlayButton />
        <EmbedPlayerMoreButton />
      </div>
    </div>
  );
}
