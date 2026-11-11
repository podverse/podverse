import { useTranslations } from 'next-intl';
import React from 'react';

import { BrowseEmptyResults } from '../../components/Browse/BrowseEmptyResults';
import { ListPlaylists } from '../../components/List/Playlists/ListPlaylists';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import {
  shouldShowBrowseByRecentAction,
  shouldShowBrowseEmptyMessage,
} from '../../utils/mediaListChips';
import { usePlaylistsPageContext } from './PlaylistsPageContext';

export const PlaylistsPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    playlists,
    totalPages,
    isLoading,
    showLoginMessage,
    listScope,
  } = usePlaylistsPageContext();
  const tFeatures = useTranslations('features');
  const { page, type } = filterParams;

  const showCreator = filterParams.type === 'public' || filterParams.type === 'private_followed';

  const showEmpty = shouldShowBrowseEmptyMessage({
    isBrowse: listScope === 'browse',
    isLoading,
    page,
    rowCount: playlists.length,
  });
  const showBrowseByRecent = shouldShowBrowseByRecentAction({
    showEmpty,
    sort: filterParams.sort,
  });
  const handleBrowseByRecent = () => {
    setFilterParams({ ...filterParams, page: 1, sort: 'recent', range: null });
  };

  return (
    <>
      {showEmpty ? (
        <BrowseEmptyResults
          message={tFeatures('playlist.no_playlists_found')}
          onBrowseByRecent={showBrowseByRecent ? handleBrowseByRecent : undefined}
        />
      ) : (
        <ListPlaylists
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          playlists={playlists}
          totalPages={totalPages}
          showLoginMessage={showLoginMessage}
          type={type}
          showCreator={showCreator}
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
