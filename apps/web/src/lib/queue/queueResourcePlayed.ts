import type { QueueResourcesAbridgedIndex } from '@podverse/helpers';
import { updateQueueResourceAbridgedIndex } from '@podverse/helpers';

/** One queue resource whose played flag can be read or written in the session index. */
export type QueuePlayedTarget =
  | { kind: 'item'; id: number; duration?: string | null }
  | { kind: 'clip'; id: number; duration?: string | null }
  | { kind: 'soundbite'; id: number; duration?: string | null }
  | { kind: 'add_by_rss'; hash: string; duration?: string | null };

type AbridgedBucket = { p: string; d: string; z?: boolean };

const clearedUpdates = {
  add_by_rss_resource_data: null,
  clip: null,
  item: null,
  item_soundbite: null,
};

const bucketFor = (
  index: QueueResourcesAbridgedIndex,
  target: QueuePlayedTarget
): AbridgedBucket | undefined => {
  if (target.kind === 'item') {
    return index.items[target.id];
  }
  if (target.kind === 'clip') {
    return index.clips[target.id];
  }
  if (target.kind === 'soundbite') {
    return index.item_soundbites[target.id];
  }
  return index.add_by_rss_resource_datas[target.hash];
};

const durationFor = (index: QueueResourcesAbridgedIndex, target: QueuePlayedTarget): string => {
  const stored = bucketFor(index, target)?.d;
  if (typeof stored === 'string' && stored.length > 0) {
    return stored;
  }
  if (typeof target.duration === 'string' && target.duration.length > 0) {
    return target.duration;
  }
  return '0';
};

/** True when this resource's abridged row is marked completed. */
export const isQueueResourcePlayed = (
  index: QueueResourcesAbridgedIndex,
  target: QueuePlayedTarget
): boolean => {
  return bucketFor(index, target)?.z === true;
};

/** True when any of the row's Add by RSS hashes is marked completed. */
export const isAnyAddByRssHashPlayed = (
  index: QueueResourcesAbridgedIndex,
  hashes: readonly string[] | null | undefined
): boolean => {
  if (hashes === null || hashes === undefined) {
    return false;
  }
  for (const hash of hashes) {
    if (index.add_by_rss_resource_datas[hash]?.z === true) {
      return true;
    }
  }
  return false;
};

/**
 * Mark one resource played in the session index. Position returns to 0 and the stored duration
 * is kept, so time-left still has a length after the check appears.
 */
export const applyQueueResourcePlayed = (
  index: QueueResourcesAbridgedIndex,
  target: QueuePlayedTarget
): QueueResourcesAbridgedIndex => {
  const played = { d: durationFor(index, target), p: '0', z: true };

  if (target.kind === 'item') {
    return updateQueueResourceAbridgedIndex(index, {
      ...clearedUpdates,
      item: { i: target.id, ...played },
    });
  }
  if (target.kind === 'clip') {
    return updateQueueResourceAbridgedIndex(index, {
      ...clearedUpdates,
      clip: { i: target.id, ...played },
    });
  }
  if (target.kind === 'soundbite') {
    return updateQueueResourceAbridgedIndex(index, {
      ...clearedUpdates,
      item_soundbite: { i: target.id, ...played },
    });
  }
  return updateQueueResourceAbridgedIndex(index, {
    ...clearedUpdates,
    add_by_rss_resource_data: { a: target.hash, ...played },
  });
};

/** Run `markPlayed` only after the history write resolves. */
export const markPlayedAfterWrite = (
  request: Promise<unknown>,
  markPlayed: () => void
): Promise<void> => {
  return request.then(() => {
    markPlayed();
  });
};
