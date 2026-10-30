'use client';

import { useSyncExternalStore } from 'react';

import type { LiveMediaSnapshot } from '../lib/livePlayback/liveMediaStore';
import { liveMediaStore } from '../lib/livePlayback/liveMediaStore';

/** The playing live element's place in its window; detached when no live element is registered. */
export function useLiveMediaSnapshot(): LiveMediaSnapshot {
  return useSyncExternalStore(
    liveMediaStore.subscribe,
    liveMediaStore.getSnapshot,
    liveMediaStore.getSnapshot
  );
}
