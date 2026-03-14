'use client';

import { useRouter } from 'next/navigation';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { SubscribeButton } from '../../../components/Media/Header/SubscribeButton';
import { PlaylistPageHeaderInfo } from './PlaylistPageHeaderInfo';

import styles from '../../../styles/app/playlist/PlaylistHeader.module.scss';

type PlaylistPageHeaderProps = {
  playlist: DTOPlaylist;
};

export const PlaylistPageHeader: React.FC<PlaylistPageHeaderProps> = ({ playlist }) => {
  const router = useRouter();

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
        <SubscribeButton entity={playlist} kind="playlist" onEdit={handleEditClick} />
      </div>
    </header>
  );
};
