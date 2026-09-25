import { useSyncExternalStore } from 'react';

import { readQueueDataRevision, subscribeQueueDataRevision } from '../sync/queueDataRevision';

/**
 * Counter that changes whenever queue data changes, from a local write or from background sync.
 *
 * Name it in a loader's dependency list and the loader reruns once the change lands, which is
 * what keeps a queue-backed screen from stranding on state the server has already replaced.
 */
export function useQueueDataRevision(): number {
  return useSyncExternalStore(subscribeQueueDataRevision, readQueueDataRevision);
}
