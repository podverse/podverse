import { useSyncExternalStore } from 'react';

import { readQueueDataRevision, subscribeQueueDataRevision } from '../sync/queueDataRevision';

/**
 * Counter that changes whenever background sync rewrites queue data.
 *
 * Name it in a loader's dependency list and the loader reruns once the reconcile lands, which is
 * what keeps a queue-backed screen from stranding on state the server has already replaced.
 */
export function useQueueDataRevision(): number {
  return useSyncExternalStore(subscribeQueueDataRevision, readQueueDataRevision);
}
