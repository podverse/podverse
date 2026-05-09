'use client';

import { useTranslations } from 'next-intl';
import React from 'react';

import { Modal } from '@podverse/ui';

import { useMediaPlayer } from '../../../contexts/MediaPlayer';
import { MediaPlayerButtonsModal } from './MediaPlayerButtonsModal';
import { MediaPlayerControlsModal } from './MediaPlayerControlsModal';
import { MediaPlayerInfoModal } from './MediaPlayerInfoModal';

import styles from '../../../styles/components/MediaPlayer/Modal/MediaPlayerModal.module.scss';

export const MediaPlayerModal: React.FC = () => {
  const tMediaPlayer = useTranslations('media_player');
  const tMisc = useTranslations('misc');
  const { playerModalIsOpen, setPlayerModalIsOpen } = useMediaPlayer();

  return (
    <Modal
      isOpen={playerModalIsOpen}
      onClose={() => setPlayerModalIsOpen(false)}
      closeButtonAriaLabel={tMisc('close_modal')}
      ariaLabel={tMediaPlayer('fullscreen_media_player')}
      contentOverflowHidden
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
