'use client';

import { useTranslations } from 'next-intl';

import { getNextPlaybackSpeed, getPlaybackTranslationKey } from '@podverse/helpers';

import { useMediaPlayer } from '../../contexts/MediaPlayer';

import styles from '../../styles/components/embed/EmbedPlaybackSpeedButton.module.scss';

export function EmbedPlaybackSpeedButton() {
  const tMediaPlayer = useTranslations('media_player');
  const { mpPlaybackSpeed, setMPPlaybackSpeed } = useMediaPlayer();

  const onClick = () => {
    setMPPlaybackSpeed(getNextPlaybackSpeed(mpPlaybackSpeed));
  };

  return (
    <button
      className={styles.playbackSpeedButton}
      aria-label={tMediaPlayer('playback_speed.playback_speed')}
      data-testid="embed-player-playback-speed-button"
      onClick={onClick}
      type="button"
    >
      {tMediaPlayer(`playback_speed.speeds.${getPlaybackTranslationKey(mpPlaybackSpeed)}`)}
    </button>
  );
}
