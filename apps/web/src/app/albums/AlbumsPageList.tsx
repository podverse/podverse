'use client';

import React from 'react';

import { CoreAlbums } from '../../components/Core/Artist/Album/CoreAlbums';
import { HowToStartInfo } from '../../components/InfoWrapper/HowToStartInfo';
import LoadingSpinnerOverlay from '../../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useAlbumsPageContext } from './AlbumsPageContext';

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
