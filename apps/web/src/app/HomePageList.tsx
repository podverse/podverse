'use client';

import React from 'react';
import { CoreCombinedChannels } from '../components/Core/CombinedChannels/CoreCombinedChannels';
import LoadingSpinnerOverlay from '../components/LoadingSpinner/LoadingSpinnerOverlay';
import { useHomePageContext } from './HomePageContext';
import { useAccount } from '../contexts/Account';
import { useLocalSettings } from '../contexts/LocalSettings';
import { HowToStartInfo } from '../components/InfoWrapper/HowToStartInfo';

export const HomePageList: React.FC = () => {
  const { filterParams, setFilterParams, channels, totalPages, isLoading } = useHomePageContext();
  const { loggedInAccount } = useAccount();
  const { viewSelected } = useLocalSettings();
  const { page, medium } = filterParams;

  return (
    <>
      <HowToStartInfo rows={channels} totalPages={totalPages} />
      {loggedInAccount && channels.length !== 0 && (
        <CoreCombinedChannels
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          channels={channels}
          totalPages={totalPages}
          filterMedium={medium}
          viewSelected={viewSelected}
        />
      )}
      <LoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
