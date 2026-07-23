import type { PropsWithChildren } from 'react';
import { createContext, useContext, useEffect, useMemo, useRef, useState } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers/dto';

import { useAuth } from '../auth/AuthProvider';
import type { MobileAuthRequestContext } from '../data';
import { queueRepository } from '../data';
import { useQueueResourcesLoadActive } from '../hooks/useQueueResourcesLoadActive';

/**
 * Mobile queue store — mirrors web `apps/web/src/contexts/Queue.tsx` boundaries. The provider owns
 * only in-memory UI state (queues / activeQueue / upcoming); persistence + sync live in
 * `queueRepository`. Screens read this store and call repository-backed hooks — never `req*`.
 */
type QueuesContextType = {
  queues: DTOQueue[];
  setQueues: (val: DTOQueue[]) => void;
  activeQueue: DTOQueue | null;
  setActiveQueue: (val: DTOQueue | null) => void;
  activeQueueUpcomingResources: DTOQueueResource[];
  setActiveQueueUpcomingResources: (val: DTOQueueResource[]) => void;
};

const QueuesContext = createContext<QueuesContextType | undefined>(undefined);

export function QueuesProvider({ children }: PropsWithChildren) {
  const [queues, setQueues] = useState<DTOQueue[]>([]);
  const [activeQueue, setActiveQueue] = useState<DTOQueue | null>(null);
  const [activeQueueUpcomingResources, setActiveQueueUpcomingResources] = useState<
    DTOQueueResource[]
  >([]);

  const value = useMemo<QueuesContextType>(
    () => ({
      activeQueue,
      activeQueueUpcomingResources,
      queues,
      setActiveQueue,
      setActiveQueueUpcomingResources,
      setQueues,
    }),
    [activeQueue, activeQueueUpcomingResources, queues]
  );

  return (
    <QueuesContext.Provider value={value}>
      <QueueLaunchHydrator />
      {children}
    </QueuesContext.Provider>
  );
}

export function useQueues(): QueuesContextType {
  const context = useContext(QueuesContext);
  if (context === undefined) {
    throw new Error('useQueues must be used within a QueuesProvider');
  }
  return context;
}

/**
 * Launch hydration: once auth resolves to authenticated, sync all queues + the abridged index into
 * the repository (SQLite) and populate the store via the load-active hook. Anonymous launches never
 * hit the authenticated queue endpoints — they clear the store instead. Renders nothing.
 */
function QueueLaunchHydrator() {
  const { accessToken, clearSession, refreshToken, setTokens, status } = useAuth();
  const { setQueues, setActiveQueue, setActiveQueueUpcomingResources } = useQueues();
  const loadActive = useQueueResourcesLoadActive();

  const authRef = useRef<MobileAuthRequestContext>({
    accessToken,
    clearSession,
    refreshToken,
    setTokens,
  });
  const hasHydratedRef = useRef(false);

  useEffect(() => {
    authRef.current = { accessToken, clearSession, refreshToken, setTokens };
  }, [accessToken, clearSession, refreshToken, setTokens]);

  useEffect(() => {
    if (status === 'anonymous') {
      hasHydratedRef.current = false;
      setQueues([]);
      setActiveQueue(null);
      setActiveQueueUpcomingResources([]);
      return;
    }

    if (status !== 'authenticated' || hasHydratedRef.current) {
      return;
    }
    hasHydratedRef.current = true;

    void (async () => {
      try {
        await queueRepository.getAbridgedIndex(authRef.current);
      } catch (error) {
        if (__DEV__) {
          console.warn('[queue] abridged index hydrate failed', error);
        }
      }

      try {
        await loadActive();
      } catch (error) {
        if (__DEV__) {
          console.warn('[queue] launch hydrate failed', error);
        }
      }
    })();
  }, [loadActive, setActiveQueue, setActiveQueueUpcomingResources, setQueues, status]);

  return null;
}
