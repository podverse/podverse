'use client';

import React from 'react';

import { CoreAlbums } from '../../components/Core/Artist/Album/CoreAlbums';
import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { LIST_VIEW_MODE_SCOPE_ALBUMS } from '../../hooks/listViewMode';
import { useListViewMode } from '../../hooks/useListViewMode';
import { useAlbumsPageContext } from './AlbumsPageContext';

export const AlbumsPageList: React.FC = () => {
  const { filterParams, setFilterParams, channels, totalPages, isLoading, showSubscribeMessage } =
    useAlbumsPageContext();
  const { viewSelected } = useListViewMode(LIST_VIEW_MODE_SCOPE_ALBUMS);
  const { page, type } = filterParams;

  return (
    <>
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={channels} totalPages={totalPages} />
      )}
      <CoreAlbums
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        channels={channels}
        totalPages={totalPages}
        showSubscribeMessage={showSubscribeMessage}
        type={type}
        viewSelected={viewSelected}
      />
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
