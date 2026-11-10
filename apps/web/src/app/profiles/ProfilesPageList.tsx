import { useTranslations } from 'next-intl';
import React from 'react';

import { BrowseEmptyResults } from '../../components/Browse/BrowseEmptyResults';
import { HowToStartInfo } from '../../components/HowToStartInfo/HowToStartInfo';
import { ListProfiles } from '../../components/List/Profiles/ListProfiles';
import { WebLoadingSpinnerOverlay } from '../../components/LoadingSpinner/WebLoadingSpinnerOverlay';
import {
  shouldShowBrowseByRecentAction,
  shouldShowBrowseEmptyMessage,
} from '../../utils/mediaListChips';
import { useProfilesPageContext } from './ProfilesPageContext';

export const ProfilesPageList: React.FC = () => {
  const {
    filterParams,
    setFilterParams,
    accounts,
    totalPages,
    isLoading,
    showSubscribeMessage,
    listScope,
  } = useProfilesPageContext();
  const tFeatures = useTranslations('features');
  const { page, type } = filterParams;

  const showEmpty = shouldShowBrowseEmptyMessage({
    isBrowse: listScope === 'browse',
    isLoading,
    page,
    rowCount: accounts.length,
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
      {filterParams.type === 'subscribed' && (
        <HowToStartInfo rows={accounts} totalPages={totalPages} />
      )}
      {showEmpty ? (
        <BrowseEmptyResults
          message={tFeatures('browse.no_users_found')}
          onBrowseByRecent={showBrowseByRecent ? handleBrowseByRecent : undefined}
        />
      ) : (
        <ListProfiles
          page={page}
          setPage={(page) => setFilterParams({ ...filterParams, page })}
          accounts={accounts}
          totalPages={totalPages}
          showSubscribeMessage={showSubscribeMessage}
          type={type}
        />
      )}
      <WebLoadingSpinnerOverlay isLoading={isLoading} />
    </>
  );
};
