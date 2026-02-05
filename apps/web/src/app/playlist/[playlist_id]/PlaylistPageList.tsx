'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { LazyLoadPlaceholder } from '../../../components/LazyLoadPlaceholder/LazyLoadPlaceholder';
import { usePlaylistPageContext } from './PlaylistPageContext';

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

type PlaylistPageListProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistPageList: React.FC<PlaylistPageListProps> = ({ ssrPlaylist }) => {
  const { playlistResources, totalPages, filterParams, setFilterParams } = usePlaylistPageContext();
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
