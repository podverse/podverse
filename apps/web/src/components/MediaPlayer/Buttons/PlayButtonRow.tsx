import { useTranslations } from 'next-intl';
import { FaPause, FaPlay } from 'react-icons/fa6';

import type { DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';
import { clampRatio } from '@podverse/helpers/math';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlayButtonRow.module.scss';

type PlayButtonRowProps = {
  clip?: DTOClip;
  item: DTOItem | null;
  item_soundbite?: DTOItemSoundbite;
  item_chapter?: DTOItemChapter;
  /** When provided (e.g. add-by-RSS livestream row), match now-playing by idText; item may be null. */
  addByRSSIdText?: string;
  onClick: () => void;
};

/**
 * Playhead for the active list row only. Reads current time from the dedicated context so sibling
 * `PlayButtonRow` instances (session match only) do not re-render on every timeupdate.
 */
function PlayButtonRowProgress() {
  const { mpDuration } = useMediaPlayer();
  const { mpCurrentTime } = useMediaPlayerCurrentTime();
  const ratio = mpDuration > 0 ? clampRatio(mpCurrentTime / mpDuration) : 0;
  const percent = ratio * 100;

  return (
    <div
      aria-hidden="true"
      className={styles.playButtonRowProgress}
      data-testid="play-button-row-progress"
    >
      <div className={styles.playButtonRowProgressFill} style={{ width: `${percent}%` }} />
    </div>
  );
}

export const PlayButtonRow: React.FC<PlayButtonRowProps> = ({
  clip,
  item,
  item_chapter,
  item_soundbite,
  addByRSSIdText,
  onClick,
}) => {
  const { mpIsPlaying, mpItem, mpItemChapter, mpItemSoundbite, mpClip, mpAddByRSS } =
    useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');

  if (!item && !addByRSSIdText) {
    return null;
  }

  let isCurrentlyInPlayer = false;
  if (addByRSSIdText && mpAddByRSS?.idText === addByRSSIdText) {
    isCurrentlyInPlayer = true;
  } else if (item_chapter && item) {
    isCurrentlyInPlayer = mpItemChapter?.id_text === item_chapter.id_text;
  } else if (item_soundbite && item) {
    isCurrentlyInPlayer = mpItemSoundbite?.id_text === item_soundbite.id_text;
  } else if (clip && item) {
    isCurrentlyInPlayer = mpClip?.id_text === clip.id_text;
  } else if (mpItem && item) {
    isCurrentlyInPlayer = mpItem.id_text === item.id_text;
  }

  const isPlaying = isCurrentlyInPlayer && mpIsPlaying;
  const label = isPlaying ? tMediaPlayer('pause') : tMediaPlayer('play');
  const icon = isPlaying ? <FaPause /> : <FaPlay />;

  return (
    <div
      className={
        isCurrentlyInPlayer ? styles.playButtonRowClusterActive : styles.playButtonRowCluster
      }
    >
      <button
        className={styles.playButtonRow}
        aria-label={label}
        data-media-player-playing={isPlaying ? 'true' : undefined}
        onClick={onClick}
        type="button"
      >
        {icon}
      </button>
      {isCurrentlyInPlayer ? <PlayButtonRowProgress /> : null}
    </div>
  );
};
