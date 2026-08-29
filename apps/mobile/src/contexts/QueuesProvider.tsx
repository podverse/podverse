import type { PropsWithChildren } from 'react';
import { createContext, useContext, useMemo, useState } from 'react';

import type { DTOQueue, DTOQueueResource } from '@podverse/helpers/dto';

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

  return <QueuesContext.Provider value={value}>{children}</QueuesContext.Provider>;
}

export function useQueues(): QueuesContextType {
  const context = useContext(QueuesContext);
  if (context === undefined) {
    throw new Error('useQueues must be used within a QueuesProvider');
  }
  return context;
}
