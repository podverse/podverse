'use client';

import classNames from 'classnames';
import { useTranslations } from 'next-intl';
import { FaInfinity } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { cssClass } from '../../../utils/cssModule';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlaybackMode.module.scss';

export const PlaybackModeButton = () => {
  const { mpPlaybackMode, setMPPlaybackMode } = useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');
  const isAutoplayNext = mpPlaybackMode === 'autoplay-next';

  const onClick = () => {
    const newMode = isAutoplayNext ? 'stop-at-end' : 'autoplay-next';
    setMPPlaybackMode(newMode);
  };

  return (
    <button
      className={classNames(styles.playbackModeButton, {
        [cssClass(styles, 'active')]: isAutoplayNext,
      })}
      aria-label={tMediaPlayer('playback_mode.toggle_autoplay')}
      aria-pressed={isAutoplayNext}
      title={
        isAutoplayNext
          ? tMediaPlayer('playback_mode.autoplay_next_enabled')
          : tMediaPlayer('playback_mode.autoplay_next_disabled')
      }
      onClick={onClick}
      type="button"
    >
      <FaInfinity aria-hidden />
    </button>
  );
};
