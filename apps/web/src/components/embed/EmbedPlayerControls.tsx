'use client';

import { PlayButton } from '../MediaPlayer/Buttons/PlayButton';

import { EmbedPlayerMoreButton } from './EmbedPlayerMoreButton';
import { MediaPlayerProgress } from '../MediaPlayer/Sliders/MediaPlayerProgress';

import styles from '../../styles/components/embed/EmbedPlayerControls.module.scss';

type EmbedPlayerControlsProps = {
  showChapterMarkers: boolean;
};

export function EmbedPlayerControls({ showChapterMarkers }: EmbedPlayerControlsProps) {
  return (
    <div className={styles.controls} data-testid="embed-player-controls">
      <div className={styles.progressRow}>
        <MediaPlayerProgress layoutVariant="embed" showChapterMarkers={showChapterMarkers} />
      </div>
      <div className={styles.transportRow} data-testid="embed-player-transport">
        <PlayButton />
        <EmbedPlayerMoreButton />
      </div>
    </div>
  );
}
