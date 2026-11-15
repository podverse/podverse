import AsyncStorage from '@react-native-async-storage/async-storage';

import { v4CarryoverRepository } from '../../data/repositories/v4CarryoverRepository';
import type { V4StagedEntry } from './parseV4LocalState';
import { parseV4LocalState } from './parseV4LocalState';

/**
 * The previous app's signed-out subscription lists. Feed passwords and the sign-in token are
 * not in this set.
 */
export const V4_LOCAL_STATE_KEYS = {
  addByRssFeedUrls: 'ADD_BY_RSS_PODCAST_FEED_URLS',
  addByRssPodcasts: 'ADD_BY_RSS_PODCASTS',
  subscribedPodcastIds: 'SUBSCRIBED_PODCAST_IDS',
  subscribedPodcasts: 'SUBSCRIBED_PODCASTS',
} as const;

const V4_ASYNC_STORAGE_KEYS = [
  V4_LOCAL_STATE_KEYS.subscribedPodcastIds,
  V4_LOCAL_STATE_KEYS.subscribedPodcasts,
  V4_LOCAL_STATE_KEYS.addByRssFeedUrls,
  V4_LOCAL_STATE_KEYS.addByRssPodcasts,
] as const;

type ReadCounts = {
  addByRss: number;
  podcast: number;
  withCachedFeedUrl: number;
  withCachedTitle: number;
};

const summarize = (entries: readonly V4StagedEntry[]): ReadCounts => {
  const counts: ReadCounts = {
    addByRss: 0,
    podcast: 0,
    withCachedFeedUrl: 0,
    withCachedTitle: 0,
  };
  for (const entry of entries) {
    if (entry.legacyKind === 'podcast') {
      counts.podcast += 1;
    } else {
      counts.addByRss += 1;
    }
    if (entry.cachedFeedUrl !== null) {
      counts.withCachedFeedUrl += 1;
    }
    if (entry.cachedTitle !== null) {
      counts.withCachedTitle += 1;
    }
  }
  return counts;
};

const readStoredState = async () => {
  const stored = await AsyncStorage.multiGet([...V4_ASYNC_STORAGE_KEYS]);
  const byKey = new Map(stored);
  return parseV4LocalState({
    addByRssFeedUrls: byKey.get(V4_LOCAL_STATE_KEYS.addByRssFeedUrls) ?? null,
    addByRssPodcasts: byKey.get(V4_LOCAL_STATE_KEYS.addByRssPodcasts) ?? null,
    subscribedPodcastIds: byKey.get(V4_LOCAL_STATE_KEYS.subscribedPodcastIds) ?? null,
    subscribedPodcasts: byKey.get(V4_LOCAL_STATE_KEYS.subscribedPodcasts) ?? null,
  });
};

let onCarryoverRowsSaved: (() => void) | null = null;

/** Called after a read stores at least one row, so sync can resolve them without waiting for another launch. */
export const registerV4CarryoverRowsSaved = (listener: (() => void) | null): void => {
  onCarryoverRowsSaved = listener;
};

const performRead = async (): Promise<void> => {
  try {
    if (await v4CarryoverRepository.hasRead()) {
      return;
    }
    const entries = await readStoredState();
    await v4CarryoverRepository.saveRead(entries);
    await v4CarryoverRepository.setCopyAllowed();
    // eslint-disable-next-line no-console -- counts only; this line is the record of the one-time read
    console.info('[v4-carryover] read finished', summarize(entries));
    if (entries.length > 0) {
      try {
        onCarryoverRowsSaved?.();
      } catch {
        console.warn('[v4-carryover] could not schedule resolve');
      }
    }
  } catch {
    console.warn('[v4-carryover] read failed');
    try {
      await v4CarryoverRepository.markRead();
    } catch {
      // The flag could not be stored. The next launch tries the read again.
    }
  }
};

let tail: Promise<void> = Promise.resolve();

/** Runs after any carryover read already started, and before one started later. */
export const enqueueV4CarryoverWork = (task: () => Promise<void>): Promise<void> => {
  const run = tail.then(task, task);
  tail = run.then(
    () => undefined,
    () => undefined
  );
  return run;
};

/**
 * Reads the previous app's signed-out lists once and stores them.
 *
 * A second call does nothing. A missing key is an empty list. A failed read still records that
 * it finished, so a broken store does not retry on every launch. Callers do not await this on
 * the render path.
 */
export const runV4CarryoverReadOnce = (): Promise<void> => enqueueV4CarryoverWork(performRead);
