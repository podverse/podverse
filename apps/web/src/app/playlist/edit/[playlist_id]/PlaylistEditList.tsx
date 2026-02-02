'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { LazyLoadPlaceholder } from '../../../../components/LazyLoadPlaceholder/LazyLoadPlaceholder';
import { usePlaylistEditContext } from './PlaylistEditContext';

const ListPlaylistResources = dynamic(
  () =>
    import('../../../../components/List/Playlists/ListPlaylistResources').then((m) => ({
      default: m.ListPlaylistResources,
    })),
  {
    ssr: false,
    loading: () => <LazyLoadPlaceholder />,
  }
);

type PlaylistEditListProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistEditList: React.FC<PlaylistEditListProps> = ({ ssrPlaylist }) => {
  const { playlistResources, tabSelectedKey } = usePlaylistEditContext();

  if (tabSelectedKey !== 'items') {
    return null;
  }

  return (
    <ListPlaylistResources
      playlist={ssrPlaylist}
      playlistResources={playlistResources}
      isEditMode
    />
  );
};
