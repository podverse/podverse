'use client';

import React from 'react';

import { CoreArtists } from '../../components/Core/Artist/CoreArtists';
import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useLocalSettings } from '../../contexts/LocalSettings';
import { useArtistsPageContext } from './ArtistsPageContext';

export const ArtistsPageList: React.FC = () => {
  const { filterParams, setFilterParams, channels, totalPages, isLoading, showSubscribeMessage } =
    useArtistsPageContext();
  const { viewSelected } = useLocalSettings();
  const { page, type } = filterParams;

  return (
    <>
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={channels} totalPages={totalPages} />
      )}
      <CoreArtists
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
