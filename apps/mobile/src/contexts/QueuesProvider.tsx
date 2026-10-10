import type { PropsWithChildren } from 'react';
import { createContext, useCallback, useContext, useMemo, useState } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers/dto';

import { shouldReplaceCachedValue } from '../lib/cachedValue';

/**
 * Mobile queue store — mirrors web `apps/web/src/contexts/Queue.tsx` boundaries. The provider owns
 * only in-memory UI state (queues / activeQueue / upcoming); persistence + sync live in
 * `queueRepository`. Screens read this store and call repository-backed hooks — never `req*`.
 *
 * Filling the store at launch is a queued sync job, so this holds no effects of its own.
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
  const [queues, setQueuesState] = useState<DTOQueue[]>([]);
  const [activeQueue, setActiveQueueState] = useState<DTOQueue | null>(null);
  const [activeQueueUpcomingResources, setActiveQueueUpcomingResourcesState] = useState<
    DTOQueueResource[]
  >([]);

  // Keep the previous array or row when contents match so a failed or empty reload cannot
  // retrigger effects that depend on this store.
  const setQueues = useCallback((next: DTOQueue[]) => {
    setQueuesState((previous) => (shouldReplaceCachedValue(previous, next) ? next : previous));
  }, []);

  const setActiveQueue = useCallback((next: DTOQueue | null) => {
    setActiveQueueState((previous) => {
      if (previous === next) {
        return previous;
      }
      if (next === null) {
        return null;
      }
      return shouldReplaceCachedValue(previous, next) ? next : previous;
    });
  }, []);

  const setActiveQueueUpcomingResources = useCallback((next: DTOQueueResource[]) => {
    setActiveQueueUpcomingResourcesState((previous) =>
      shouldReplaceCachedValue(previous, next) ? next : previous
    );
  }, []);

  const value = useMemo<QueuesContextType>(
    () => ({
      activeQueue,
      activeQueueUpcomingResources,
      queues,
      setActiveQueue,
      setActiveQueueUpcomingResources,
      setQueues,
    }),
    [
      activeQueue,
      activeQueueUpcomingResources,
      queues,
      setActiveQueue,
      setActiveQueueUpcomingResources,
      setQueues,
    ]
  );

  return <QueuesContext.Provider value={value}>{children}</QueuesContext.Provider>;
}

export function useQueues(): QueuesContextType {
  const context = useContext(QueuesContext);
  if (context === undefined) {
    throw new Error('useQueues must be used within a QueuesProvider');
  }
  return context;
}
