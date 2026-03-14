'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { Modal } from '../../Modal/Modal';
import { MediaPlayerButtonsModal } from './MediaPlayerButtonsModal';
import { MediaPlayerControlsModal } from './MediaPlayerControlsModal';
import { MediaPlayerInfoModal } from './MediaPlayerInfoModal';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerModal.module.scss';

export const MediaPlayerModal: React.FC = () => {
  const tMediaPlayer = useTranslations('media_player');
  const { playerModalIsOpen, setPlayerModalIsOpen } = useMediaPlayer();

  return (
    <Modal
      isOpen={playerModalIsOpen}
      onClose={() => setPlayerModalIsOpen(false)}
      ariaLabel={tMediaPlayer('fullscreen_media_player')}
      contentTransparent
    >
      <div className={styles.mediaPlayerModal}>
        <div className={styles.mediaPlayerModalContent}>
          <MediaPlayerInfoModal />
          <MediaPlayerControlsModal />
          <MediaPlayerButtonsModal />
        </div>
      </div>
    </Modal>
  );
};
