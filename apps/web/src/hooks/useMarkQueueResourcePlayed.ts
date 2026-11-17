'use client';

import { useCallback, useRef } from 'react';

import { useQueueResourcesAbridgedIndex } from '../contexts/QueueResourcesAbridgedIndex';
import type { QueuePlayedTarget } from '../lib/queue/queueResourcePlayed';
import { applyQueueResourcePlayed } from '../lib/queue/queueResourcePlayed';

/** Patch the in-memory abridged index so a list check appears without reloading it. */
export function useMarkQueueResourcePlayed(): (target: QueuePlayedTarget) => void {
  const { queueResourcesAbridgedIndex, setQueueResourcesAbridgedIndex } =
    useQueueResourcesAbridgedIndex();
  const indexRef = useRef(queueResourcesAbridgedIndex);
  const setIndexRef = useRef(setQueueResourcesAbridgedIndex);
  indexRef.current = queueResourcesAbridgedIndex;
  setIndexRef.current = setQueueResourcesAbridgedIndex;

  return useCallback((target: QueuePlayedTarget) => {
    const next = applyQueueResourcePlayed(indexRef.current, target);
    indexRef.current = next;
    setIndexRef.current(next);
  }, []);
}
