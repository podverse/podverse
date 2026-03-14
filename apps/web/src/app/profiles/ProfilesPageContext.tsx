'use client';

import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

import type { DTOAccount } from '@podverse/helpers';
import { getTotalPages } from '@podverse/helpers';
import type {
  QueryParamsStatsRange,
  QueryParamsSubscribedFullSort,
  QueryParamsSubscribedType,
} from '@podverse/helpers-requests';

import { useAccount } from '../../contexts/Account';
import { getApiRequestService } from '../../factories/apiRequestService';
import { useFilterDefaults } from '../../hooks/useFilterDefaults';
import { useListPageCache } from '../../hooks/useListPageCache';
import { useSkipInitialEffect } from '../../hooks/useSkipInitialEffect';
import { getProfilesPageFilterParams } from './ProfilesPageDropdownConfig';

export type ProfilesPageQueryParams = {
  page: number;
  type: QueryParamsSubscribedType;
  sort: QueryParamsSubscribedFullSort;
  range: QueryParamsStatsRange | null;
};

interface ProfilesPageContextType {
  filterParams: ProfilesPageQueryParams;
  setFilterParams: (params: ProfilesPageQueryParams) => void;
  accounts: DTOAccount[];
  setAccounts: (accounts: DTOAccount[]) => void;
  totalPages: number;
  setTotalPages: (totalPages: number) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showSubscribeMessage: boolean;
  setShowSubscribeMessage: (show: boolean) => void;
}

const ProfilesPageContext = createContext<ProfilesPageContextType | undefined>(undefined);

interface ProfilesPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: ProfilesPageQueryParams;
  ssrAccounts: DTOAccount[];
  ssrTotalPages: number;
}

export const ProfilesPageContextProvider = ({
  children,
  initialQueryParams,
  ssrAccounts,
  ssrTotalPages,
}: ProfilesPageContextProviderProps) => {
  // Use the list page cache hook for back navigation caching
  const {
    filterParams,
    setFilterParams,
    data: accounts,
    setData: setAccounts,
    totalPages,
    setTotalPages,
    shouldSkipFetch,
  } = useListPageCache<ProfilesPageQueryParams, DTOAccount[]>({
    routeKey: 'profiles',
    initialParams: initialQueryParams,
    ssrData: ssrAccounts ?? [],
    ssrTotalPages,
  });

  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [showSubscribeMessage, setShowSubscribeMessage] = useState<boolean>(false);
  const { loggedInAccount } = useAccount();
  const apiRequestService = getApiRequestService();

  useFilterDefaults('profiles', filterParams);

  useSkipInitialEffect(() => {
    // Skip fetch if we just restored from cache - data is already correct
    if (shouldSkipFetch.current) {
      shouldSkipFetch.current = false;
      return;
    }

    async function fetchAccounts() {
      if (filterParams.type === 'subscribed') {
        if (!loggedInAccount) {
          setAccounts([]);
          setShowSubscribeMessage(true);
          return;
        }
      }

      setIsLoading(true);

      const { currentSort, currentRange, currentType } = getProfilesPageFilterParams(
        {
          page: filterParams.page,
          type: filterParams.type,
          sort: filterParams.sort,
          range: filterParams.range,
        },
        !!loggedInAccount
      );

      const response = await apiRequestService.reqAccountGetMany({
        type: currentType,
        sort: currentSort,
        range: currentRange,
        page: filterParams.page,
      });

      const totalPages = getTotalPages(
        response.meta.count || response.data.length,
        response.meta.limit || 50,
        response.data.length,
        filterParams.page
      );
      setTotalPages(totalPages);
      setAccounts(response.data);
      setShowSubscribeMessage(false);
      setIsLoading(false);
    }
    fetchAccounts();
  }, [filterParams, loggedInAccount]);

  return (
    <ProfilesPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        accounts,
        setAccounts,
        totalPages,
        setTotalPages,
        isLoading,
        setIsLoading,
        showSubscribeMessage,
        setShowSubscribeMessage,
      }}
    >
      {children}
    </ProfilesPageContext.Provider>
  );
};

export const useProfilesPageContext = () => {
  const ctx = useContext(ProfilesPageContext);
  if (!ctx) {
    throw new Error('useProfilesPageContext must be used within a ProfilesPageContextProvider');
  }
  return ctx;
};
