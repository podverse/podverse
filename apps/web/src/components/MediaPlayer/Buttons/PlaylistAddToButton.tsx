'use client';

import { useTranslations } from 'next-intl';
import { FaPlus } from 'react-icons/fa6';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { useModals } from '../../../contexts/Modals';

import styles from '../../../styles/components/MediaPlayer/Buttons/PlaylistAddToButton.module.scss';

export const PlaylistAddToButton = () => {
  const { mpChannel, mpItem, mpClip, mpItemSoundbite } = useMediaPlayer();
  const { setModalPlaylistAddTo } = useModals();
  const tFeatures = useTranslations('features');

  const onClick = () => {
    setModalPlaylistAddTo({
      channel: mpChannel,
      item: mpItem,
      clip: mpClip,
      item_soundbite: mpItemSoundbite,
    });
  };

  return (
    <button
      className={styles.playlistAddToButton}
      aria-label={tFeatures('playlist.add_to_playlist')}
      onClick={onClick}
      type="button"
    >
      <FaPlus aria-hidden />
    </button>
  );
};
