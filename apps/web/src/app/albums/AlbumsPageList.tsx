'use client';

import React from 'react';
import { useAlbumsPageContext } from './AlbumsPageContext';
import { CoreAlbums } from '../../components/Core/List/Album/CoreAlbums';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { HowToStartInfo } from '../../components/InfoWrapper/HowToStartInfo';

export const AlbumsPageList: React.FC = () => {
  const { filterParams, setFilterParams, channels, totalPages, isLoading, showSubscribeMessage } =
    useAlbumsPageContext();
  const { viewSelected } = useLocalSettings();
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
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
