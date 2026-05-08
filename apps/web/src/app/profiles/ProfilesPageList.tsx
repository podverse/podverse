import React from 'react';

import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { ListProfiles } from '../../components/List/Profiles/ListProfiles';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import { useProfilesPageContext } from './ProfilesPageContext';

export const ProfilesPageList: React.FC = () => {
  const { filterParams, setFilterParams, accounts, totalPages, isLoading, showSubscribeMessage } =
    useProfilesPageContext();
  const { page, type } = filterParams;

  return (
    <>
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={accounts} totalPages={totalPages} />
      )}
      <ListProfiles
        page={page}
        setPage={(page) => setFilterParams({ ...filterParams, page })}
        accounts={accounts}
        totalPages={totalPages}
        showSubscribeMessage={showSubscribeMessage}
        type={type}
      />
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
