'use client';

import { useParams } from 'next/navigation';
import type { QueryParamsLiveItem } from '@podverse/helpers-requests';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';

interface LivestreamPageContextType {
  filterParams: QueryParamsLiveItem;
  setFilterParams: (params: QueryParamsLiveItem) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const LivestreamPageContext = createContext<LivestreamPageContextType | undefined>(undefined);

interface LivestreamPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsLiveItem;
}

export const LivestreamPageContextProvider = ({
  children,
  initialQueryParams,
}: LivestreamPageContextProviderProps) => {
  const params = useParams();
  const [filterParams, setFilterParams] = useState<QueryParamsLiveItem>(initialQueryParams);
  const [isLoading, setIsLoading] = useState<boolean>(false);

  if (!params.item_id) {
    return null;
  }

  return (
    <LivestreamPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </LivestreamPageContext.Provider>
  );
};

export const useLivestreamPageContext = () => {
  const ctx = useContext(LivestreamPageContext);
  if (!ctx) {
    throw new Error(
      'useLivestreamPageContext must be used within an LivestreamPageContextProvider'
    );
  }
  return ctx;
};
