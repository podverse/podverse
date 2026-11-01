import { useTranslations } from 'next-intl';
import type { ReactNode } from 'react';
import { FaPause, FaPlay } from 'react-icons/fa6';

import type {
  AddByRSSResourceData,
  DTOClip,
  DTOItem,
  DTOItemChapter,
  DTOItemSoundbite,
} from '@podverse/helpers';
import { clampRatio } from '@podverse/helpers/math';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useMediaPlayerCurrentTime } from '../../../contexts/MediaPlayerCurrentTime';
import { useRemotePlaybackPositionSeconds } from '../../../hooks/useRemotePlaybackPositionSeconds';
import { useRemotePlayerDisplay } from '../../../hooks/useRemotePlayerDisplay';
import { useRemoteRowPlayback } from '../../../hooks/useRemoteRowPlayback';
import { checkIsLiveItem } from '../../../utils/mediaPlayer/mediaPlayerItemEnclosureType';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlayButtonRow.module.scss';

type PlayButtonRowProps = {
  clip?: DTOClip;
  item: DTOItem | null;
  item_soundbite?: DTOItemSoundbite;
  item_chapter?: DTOItemChapter;
  /** When provided (e.g. add-by-RSS livestream row), match now-playing by idText; item may be null. */
  addByRSSIdText?: string;
  /** Add by RSS hash ids for this row (getAddByRSSHashIds), to match playback on another device. */
  addByRSSHashIds?: readonly string[];
  onClick: () => void;
  /**
   * Rendered after the play button and before the progress bar (e.g. More actions), so More
   * stays next to Play while the bar grows.
   */
  afterPlay?: ReactNode;
};

function isAddByRSSLivestreamResource(resourceData: AddByRSSResourceData): boolean {
  return (
    (resourceData.liveItem !== null && resourceData.liveItem !== undefined) ||
    (resourceData.livestream_item !== null && resourceData.livestream_item !== undefined)
  );
}

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

/**
 * Playhead for the row matching playback on another device. Only that row mounts this, so only
 * it follows the remote position.
 */
function RemotePlayButtonRowProgress() {
  const remote = useRemotePlayerDisplay();
  const positionSeconds = useRemotePlaybackPositionSeconds(true);
  const durationSeconds = remote?.state.duration_seconds ?? 0;
  const position = positionSeconds ?? 0;
  const ratio = durationSeconds > 0 ? clampRatio(position / durationSeconds) : 0;
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
  addByRSSHashIds,
  onClick,
  afterPlay,
}) => {
  const { mpIsPlaying, mpItem, mpItemChapter, mpItemSoundbite, mpClip, mpAddByRSS } =
    useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');
  const remoteRow = useRemoteRowPlayback({
    itemIdText: item?.id_text ?? null,
    chapterIdText: item_chapter?.id_text ?? null,
    clipIdText: clip?.id_text ?? null,
    soundbiteIdText: item_soundbite?.id_text ?? null,
    addByRSSHashIds: addByRSSHashIds ?? null,
  });

  if (!item && !addByRSSIdText) {
    return null;
  }

  let isLocalMatch = false;
  if (addByRSSIdText && mpAddByRSS?.idText === addByRSSIdText) {
    isLocalMatch = true;
  } else if (item_chapter && item) {
    isLocalMatch = mpItemChapter?.id_text === item_chapter.id_text;
  } else if (item_soundbite && item) {
    isLocalMatch = mpItemSoundbite?.id_text === item_soundbite.id_text;
  } else if (clip && item) {
    isLocalMatch = mpClip?.id_text === clip.id_text;
  } else if (mpItem && item) {
    isLocalMatch = mpItem.id_text === item.id_text;
  }

  const isPlaying = (isLocalMatch && mpIsPlaying) || remoteRow.isPlaying;
  const label = isPlaying ? tMediaPlayer('pause') : tMediaPlayer('play');
  const icon = isPlaying ? <FaPause /> : <FaPlay />;

  const isClipChapterOrSoundbite = Boolean(clip || item_chapter || item_soundbite);
  const isLocalLivestream =
    isLocalMatch &&
    !isClipChapterOrSoundbite &&
    ((item !== null && checkIsLiveItem(item)) ||
      (addByRSSIdText !== undefined &&
        mpAddByRSS !== null &&
        mpAddByRSS.idText === addByRSSIdText &&
        isAddByRSSLivestreamResource(mpAddByRSS.resourceData)));

  const progress =
    isLocalMatch && !isLocalLivestream ? (
      <PlayButtonRowProgress />
    ) : remoteRow.showsProgress ? (
      <RemotePlayButtonRowProgress />
    ) : null;

  return (
    <div
      className={
        progress !== null ? styles.playButtonRowClusterActive : styles.playButtonRowCluster
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
      {afterPlay}
      {progress}
    </div>
  );
};
