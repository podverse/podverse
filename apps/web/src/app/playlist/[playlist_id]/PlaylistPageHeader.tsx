'use client';

import { useRouter } from 'next/navigation';
import { useTranslations } from 'next-intl';
import React from 'react';
import { FaShare } from 'react-icons/fa6';

import type { DTOPlaylist } from '@podverse/helpers';

import { IconButton } from '../../../components/Media/Header/IconButton';
import { SubscribeButton } from '../../../components/Media/Header/SubscribeButton';
import { defaultModalShare, useModals } from '../../../contexts/Modals';
import { PlaylistPageHeaderInfo } from './PlaylistPageHeaderInfo';

import styles from '../../../styles/app/playlist/PlaylistHeader.module.scss';

type PlaylistPageHeaderProps = {
  playlist: DTOPlaylist;
};

export const PlaylistPageHeader: React.FC<PlaylistPageHeaderProps> = ({ playlist }) => {
  const router = useRouter();
  const tFeatures = useTranslations('features');
  const { setModalShare } = useModals();

  const handleEditClick = () => {
    router.push(`/playlist/edit/${playlist.id_text}`);
  };

  return (
    <header className={styles.header}>
      <div className={styles.content}>
        <div className={styles.textSection}>
          <h1 className={styles.title}>{playlist.title}</h1>
          <PlaylistPageHeaderInfo playlist={playlist} />
        </div>
        <div className={styles.actions}>
          <IconButton
            type="button"
            onClick={() => setModalShare({ ...defaultModalShare, playlist })}
            ariaLabel={tFeatures('share')}
            title={tFeatures('share')}
            color="secondary"
          >
            <FaShare />
          </IconButton>
          <SubscribeButton entity={playlist} kind="playlist" onEdit={handleEditClick} />
        </div>
      </div>
    </header>
  );
};
