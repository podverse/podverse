'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { LazyLoadPlaceholder } from '../../../../components/LazyLoadPlaceholder/LazyLoadPlaceholder';
import { usePlaylistEditPageContext } from './PlaylistEditPageContext';

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

type PlaylistEditPageListProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistEditPageList: React.FC<PlaylistEditPageListProps> = ({ ssrPlaylist }) => {
  const { playlistResources, tabSelectedKey } = usePlaylistEditPageContext();

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
