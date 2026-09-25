'use client';

import React from 'react';

import { CoreCombinedChannels } from '../components/Core/CombinedChannels/CoreCombinedChannels';
import { HowToStartInfo } from '../components/HowToStartInfo/HowToStartInfo';
import { WebLoadingSpinnerOverlay } from '../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useAccount } from '../contexts/Account';
import { homeListViewModeScope } from '../hooks/listViewMode';
import { useListViewMode } from '../hooks/useListViewMode';
import { useHomePageContext } from './HomePageContext';

export const HomePageList: React.FC = () => {
  const { filterParams, setFilterParams, channels, totalPages, isLoading } = useHomePageContext();
  const { loggedInAccount } = useAccount();
  const { page, medium } = filterParams;
  const { viewSelected } = useListViewMode(homeListViewModeScope(medium));

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
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
