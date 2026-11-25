'use client';

import type { ReactNode } from 'react';
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers';
import {
  getQueueListMediumFromActiveQueues,
  getQueueMediumIdFromType,
  MediumEnum,
} from '@podverse/helpers';
import type { QueryParamsQueues } from '@podverse/helpers-requests';
import { combineQueueNowPlayingAndUpcoming } from '@podverse/playback-core';

import { useAccount } from '../../contexts/Account';
import { useConfig } from '../../contexts/Config';
import { getApiRequestService } from '../../factories/apiRequestService';
import { libraryMediumTabsVisible, musicQueueHasRows } from '../../lib/catalog/catalogListMedium';
import { QUEUE_DATA_CHANGED_EVENT } from '../../lib/queue/queueDataChanged';

interface QueuesPageContextType {
  filterParams: QueryParamsQueues;
  setFilterParams: (params: QueryParamsQueues) => void;
  mediumTabsVisible: boolean;
  queueResources: DTOQueueResource[];
  setQueueResources: (resources: DTOQueueResource[]) => void;
  isLoading: boolean;
  setIsLoading: (isLoading: boolean) => void;
  showLoginMessage: boolean;
  setShowLoginMessage: (show: boolean) => void;
}

const QueuesPageContext = createContext<QueuesPageContextType | undefined>(undefined);

interface QueuesPageContextProviderProps {
  children: ReactNode;
  initialQueryParams: QueryParamsQueues;
  mediumTabsVisible: boolean;
  ssrQueues: DTOQueue[];
  ssrQueueResources?: DTOQueueResource[];
}

export const QueuesPageContextProvider = ({
  children,
  initialQueryParams,
  mediumTabsVisible: initialMediumTabsVisible,
  ssrQueues,
  ssrQueueResources,
}: QueuesPageContextProviderProps) => {
  const musicEnabled = useConfig().public.catalog.musicEnabled;
  const [filterParams, setFilterParams] = useState<QueryParamsQueues>(initialQueryParams);
  const [mediumTabsVisible, setMediumTabsVisible] = useState(
    () => musicEnabled || initialMediumTabsVisible
  );
  const [queueResources, setQueueResources] = useState<DTOQueueResource[]>(ssrQueueResources || []);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [showLoginMessage, setShowLoginMessage] = useState<boolean>(false);
  const mediumTabsRequestRef = useRef(0);
  const { loggedInAccount } = useAccount();
  const apiRequestService = getApiRequestService();

  const recomputeMediumTabs = useCallback(async () => {
    if (musicEnabled || !loggedInAccount) {
      return;
    }

    const requestId = mediumTabsRequestRef.current + 1;
    mediumTabsRequestRef.current = requestId;
    const api = getApiRequestService();
    const queues = await api.reqQueueGetAllForAccountPrivate();
    if (mediumTabsRequestRef.current !== requestId) {
      return;
    }

    const activeQueueIsMusic = getQueueListMediumFromActiveQueues(queues) === 'music';
    const musicMediumId = getQueueMediumIdFromType('music');
    const musicQueue =
      musicMediumId === null
        ? undefined
        : queues.find((queue) => queue.medium_id === musicMediumId);
    let musicLibraryPresent = activeQueueIsMusic;
    if (musicQueue !== undefined) {
      const nowPlaying: unknown = await api.reqQueueResourcesGetNowPlayingByQueueIdText(
        musicQueue.id_text
      );
      const upcoming = await api.reqQueueResourcesGetAllUpcomingByQueueIdText(musicQueue.id_text);
      if (mediumTabsRequestRef.current !== requestId) {
        return;
      }
      musicLibraryPresent = activeQueueIsMusic || musicQueueHasRows(nowPlaying, upcoming);
    }

    if (mediumTabsRequestRef.current !== requestId) {
      return;
    }
    setMediumTabsVisible(libraryMediumTabsVisible({ musicEnabled: false, musicLibraryPresent }));
  }, [loggedInAccount, musicEnabled]);

  useEffect(() => {
    if (musicEnabled || mediumTabsVisible) {
      return;
    }
    setFilterParams((current) =>
      current.medium === 'music' ? { ...current, medium: 'av' } : current
    );
  }, [mediumTabsVisible, musicEnabled]);

  useEffect(() => {
    if (musicEnabled) {
      return;
    }
    const onQueueDataChanged = () => {
      void recomputeMediumTabs();
    };
    window.addEventListener(QUEUE_DATA_CHANGED_EVENT, onQueueDataChanged);
    return () => {
      window.removeEventListener(QUEUE_DATA_CHANGED_EVENT, onQueueDataChanged);
    };
  }, [musicEnabled, recomputeMediumTabs]);

  useEffect(() => {
    async function fetchQueueResources() {
      if (!loggedInAccount) {
        setQueueResources([]);
        setShowLoginMessage(true);
        setIsLoading(false);
        return;
      }

      setIsLoading(true);

      const currentMediumId = getQueueMediumIdFromType(filterParams.medium) || MediumEnum.AV;
      const currentQueue = ssrQueues.find((q) => q.medium_id === currentMediumId);

      if (currentQueue) {
        const nowPlayingResource =
          await apiRequestService.reqQueueResourcesGetNowPlayingByQueueIdText(currentQueue.id_text);
        const upcomingQueueResources =
          await apiRequestService.reqQueueResourcesGetAllUpcomingByQueueIdText(
            currentQueue.id_text
          );
        setQueueResources(
          combineQueueNowPlayingAndUpcoming(nowPlayingResource, upcomingQueueResources)
        );
      } else {
        setQueueResources([]);
      }

      setShowLoginMessage(false);
      setIsLoading(false);

      if (!musicEnabled && filterParams.medium === 'music') {
        void recomputeMediumTabs();
      }
    }

    fetchQueueResources();
  }, [filterParams, loggedInAccount, musicEnabled, recomputeMediumTabs]);

  return (
    <QueuesPageContext.Provider
      value={{
        filterParams,
        setFilterParams,
        mediumTabsVisible,
        queueResources,
        setQueueResources,
        isLoading,
        setIsLoading,
        showLoginMessage,
        setShowLoginMessage,
      }}
    >
      {children}
    </QueuesPageContext.Provider>
  );
};

export const useQueuesPageContext = () => {
  const ctx = useContext(QueuesPageContext);
  if (!ctx) {
    throw new Error('useQueuesPageContext must be used within a QueuesPageContextProvider');
  }
  return ctx;
};
