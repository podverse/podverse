import { useSyncExternalStore } from 'react';

import type { QueueCompletionKey } from './queueCompletionStore';
import { readQueueCompletion, subscribeQueueCompletion } from './queueCompletionStore';

const readFalse = (): boolean => false;

const snapshotReaders = new Map<string, () => boolean>();

const readerCacheKey = (key: QueueCompletionKey): string => {
  const numericId = key.numericId === null ? '' : String(key.numericId);
  return `${key.kind}\u0000${key.idText}\u0000${numericId}`;
};

const snapshotReader = (key: QueueCompletionKey): (() => boolean) => {
  const cacheKey = readerCacheKey(key);
  const existing = snapshotReaders.get(cacheKey);
  if (existing !== undefined) {
    return existing;
  }
  const stableKey: QueueCompletionKey = {
    idText: key.idText,
    kind: key.kind,
    numericId: key.numericId,
  };
  const reader = (): boolean => readQueueCompletion(stableKey);
  snapshotReaders.set(cacheKey, reader);
  return reader;
};

/**
 * Played flag for one list row. The snapshot is a boolean, so a progress tick that does not
 * change this row does not re-render it.
 */
export const useQueueResourceCompleted = (key: QueueCompletionKey | null): boolean => {
  const getSnapshot = key === null ? readFalse : snapshotReader(key);
  return useSyncExternalStore(subscribeQueueCompletion, getSnapshot, getSnapshot);
};
