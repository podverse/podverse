import { useTranslations } from 'next-intl';
import { FaPause, FaPlay } from 'react-icons/fa6';

import type { DTOClip, DTOItem, DTOItemChapter, DTOItemSoundbite } from '@podverse/helpers';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlayButtonLarge.module.scss';

type PlayButtonLargeProps = {
  clip?: DTOClip;
  item?: DTOItem;
  item_chapter?: DTOItemChapter;
  item_soundbite?: DTOItemSoundbite;
  /** When provided (e.g. add-by-RSS livestream detail), match now-playing by idText. */
  addByRSSIdText?: string;
  onClick: () => void;
};

export const PlayButtonLarge: React.FC<PlayButtonLargeProps> = ({
  clip,
  item,
  item_chapter,
  item_soundbite,
  addByRSSIdText,
  onClick,
}) => {
  const { mpIsPlaying, mpItem, mpClip, mpItemSoundbite, mpItemChapter, mpAddByRSS } =
    useMediaPlayer();
  const tMediaPlayer = useTranslations('media_player');

  let isCurrentlyInPlayer = false;
  if (addByRSSIdText && mpAddByRSS?.idText === addByRSSIdText) {
    isCurrentlyInPlayer = true;
  } else if (clip) {
    isCurrentlyInPlayer = mpClip?.id_text === clip.id_text;
  } else if (item_soundbite) {
    isCurrentlyInPlayer = mpItemSoundbite?.id_text === item_soundbite.id_text;
  } else if (item_chapter) {
    isCurrentlyInPlayer = mpItemChapter?.id_text === item_chapter.id_text;
  } else if (item && !mpClip && !mpItemSoundbite) {
    isCurrentlyInPlayer = mpItem?.id === item.id;
  }

  const isPlaying = isCurrentlyInPlayer && mpIsPlaying;
  const label = isPlaying ? tMediaPlayer('pause') : tMediaPlayer('play');
  const icon = isPlaying ? <FaPause /> : <FaPlay />;

  return (
    <button className={styles.playButtonLarge} aria-label={label} onClick={onClick} type="button">
      {icon}
    </button>
  );
};
