import React from 'react';
import { ListPlaylists } from '../../components/List/Playlists/ListPlaylists';
import { usePlaylistsPageContext } from './PlaylistsPageContext';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';

export const PlaylistsPageList: React.FC = () => {
  const { filterParams, setFilterParams, playlists, totalPages, isLoading, showLoginMessage } =
    usePlaylistsPageContext();
  const { page, type } = filterParams;

  const showCreator = filterParams.type === 'public' || filterParams.type === 'private_followed';

  return (
    <>
      <ListPlaylists
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        playlists={playlists}
        totalPages={totalPages}
        showLoginMessage={showLoginMessage}
        type={type}
        showCreator={showCreator}
      />
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
