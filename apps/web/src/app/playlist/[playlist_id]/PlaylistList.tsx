'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { LazyLoadPlaceholder } from '../../../components/LazyLoadPlaceholder/LazyLoadPlaceholder';
import { usePlaylistContext } from './PlaylistContext';

const ListPlaylistResources = dynamic(
  () =>
    import('../../../components/List/Playlists/ListPlaylistResources').then((m) => ({
      default: m.ListPlaylistResources,
    })),
  {
    ssr: false,
    loading: () => <LazyLoadPlaceholder />,
  }
);

type PlaylistListProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistList: React.FC<PlaylistListProps> = ({ ssrPlaylist }) => {
  const { playlistResources, totalPages, filterParams, setFilterParams } = usePlaylistContext();
  const { page } = filterParams;

  return (
    <>
      <ListPlaylistResources
        playlist={ssrPlaylist}
        playlistResources={playlistResources}
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        totalPages={totalPages}
      />
    </>
  );
};
