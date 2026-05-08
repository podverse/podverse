'use client';

import dynamic from 'next/dynamic';
import React from 'react';

import type { DTOPlaylist } from '@podverse/helpers';

import { WebLoadingSpinnerOverlay } from '../../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { usePlaylistPageContext } from './PlaylistPageContext';

const ListPlaylistResources = dynamic(
  () =>
    import('../../../components/List/Playlists/ListPlaylistResources').then((m) => ({
      default: m.ListPlaylistResources,
    })),
  {
    ssr: false,
    loading: () => null,
  }
);

type PlaylistPageListProps = {
  ssrPlaylist: DTOPlaylist;
};

export const PlaylistPageList: React.FC<PlaylistPageListProps> = ({ ssrPlaylist }) => {
  const { playlistResources, totalPages, filterParams, setFilterParams, isLoading, setIsLoading } =
    usePlaylistPageContext();
  const { page } = filterParams;

  return (
    <>
      <ListPlaylistResources
        playlist={ssrPlaylist}
        playlistResources={playlistResources}
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        totalPages={totalPages}
        setIsLoading={setIsLoading}
      />
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
