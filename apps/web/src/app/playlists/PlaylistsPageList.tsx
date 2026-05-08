import React from 'react';

import { ListPlaylists } from '../../components/List/Playlists/ListPlaylists';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { usePlaylistsPageContext } from './PlaylistsPageContext';

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
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
