'use client';

import { useMediaPlayer } from '../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../contexts/MediaPlayerCurrentTime';
import { resolveEmbedPlayerTimeLabel } from '../../lib/embed/resolveEmbedPlayerTimeLabel';

import styles from '../../styles/components/embed/EmbedPlayerTime.module.scss';

export function EmbedPlayerTime() {
  const { mpDuration } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const label = resolveEmbedPlayerTimeLabel(mpCurrentTime, mpDuration);

  return (
    <span className={styles.time} data-testid="embed-player-time">
      {label}
    </span>
  );
}
