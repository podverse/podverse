'use client';

import { useParams } from 'next/navigation';
import type { TranscriptRow } from '@podverse/helpers';
import type { QueryParamsItemMusic } from '@podverse/helpers-requests';
import type { ReactNode } from 'react';
import { createContext, useContext, useState } from 'react';
import { useAccount } from '../../../contexts/Account';
import { useSkipInitialEffect } from '../../../hooks/useSkipInitialEffect';
import { apiRequestService } from '../../../factories/apiRequestService';
import { getTranscriptRowsFromTranscriptString } from '../../../utils/transcript';

interface TrackPageContextType {
  filterParams: QueryParamsItemMusic;
  setFilterParams: (params: QueryParamsItemMusic) => void;
  transcriptRows: TranscriptRow[];
  setTranscriptRows: (transcriptRows: TranscriptRow[]) => void;
  autoScrollOn: boolean;
  setAutoScrollOn: (autoScrollOn: boolean) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
}

const TrackPageContext = createContext<TrackPageContextType | undefined>(undefined);

interface TrackPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsItemMusic;
}

export const TrackPageContextProvider = ({
  children,
  initialQueryParams,
}: TrackPageContextProviderProps) => {
  const params = useParams();
  const [filterParams, setFilterParams] = useState<QueryParamsItemMusic>(initialQueryParams);
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [transcriptRows, setTranscriptRows] = useState<TranscriptRow[]>([]);
  const [autoScrollOn, setAutoScrollOn] = useState<boolean>(true);
  const { loggedInAccount } = useAccount();

  if (!params.item_id) {
    return null;
  }

  const item_id = params.item_id as string;

  useSkipInitialEffect(() => {
    if (filterParams.type === 'summary') {
      return;
    }

    async function fetchTranscript() {
      const response = await apiRequestService.reqItemTranscriptGet(item_id);
      const rows = await getTranscriptRowsFromTranscriptString(response.data);
      setTranscriptRows(rows);
    }

    async function fetchData() {
      setIsLoading(true);

      if (filterParams.type === 'transcript') {
        await fetchTranscript();
      }

      setIsLoading(false);
    }

    fetchData();
  }, [filterParams, loggedInAccount]);

  return (
    <TrackPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        transcriptRows,
        setTranscriptRows,
        autoScrollOn,
        setAutoScrollOn,
        isLoading,
        setIsLoading,
      }}
    >
      {children}
    </TrackPageContext.Provider>
  );
};

export const useTrackPageContext = () => {
  const ctx = useContext(TrackPageContext);
  if (!ctx) {
    throw new Error('useTrackPageContext must be used within a TrackPageContextProvider');
  }
  return ctx;
};
