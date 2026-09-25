# 06a — Playback row store: publish now-playing facts outside context

## Goal

Every list row subscribes to `PlaybackRowContext`, whose value changes whenever the active item,
play state, notice, or enclosure changes. So one play tap re-renders every mounted row (four
components each). `runPlayAction` also depends on `activeTarget` and `isPlaying`, so its identity
changes, Home's `handlePlayPress` and `renderItem` change, and FlatList re-renders every cell.

06a adds a small store that `PlaybackProvider` publishes to after each commit, plus selector hooks
that return one row's answer (is it active, does it show pause). 06b moves the consumers over.
This milestone alone changes no behavior: nothing reads the store yet.

## Preconditions

- 05b done and T5 reviewed.

## Files

- New: `apps/mobile/src/playback/playbackRowStore.ts`
- New: `apps/mobile/src/playback/playbackRowStore.test.ts`
- `apps/mobile/src/playback/PlaybackProvider.tsx`
- `apps/mobile/vitest.config.ts`

## Step 1 — `playbackRowStore.ts` (new)

```ts
/**
 * Now-playing facts for list rows, published by `PlaybackProvider` after each commit. Rows read
 * them through selector hooks that re-render only when the row's own answer changes (is it the
 * loaded item, does it show pause), so starting or pausing playback re-renders the rows it affects
 * rather than every mounted row. Handlers read the snapshot and actions at call time, so their
 * identity never changes with playback.
 */

import { useSyncExternalStore } from 'react';

import type {
  EnclosureSelectedParams,
  LabeledItemEnclosure,
} from '@podverse/helpers/item/itemEnclosure';

export type PlaybackRowSnapshot = {
  activeMediaId: string | null;
  enclosureSelectedParams: EnclosureSelectedParams | null;
  isPlaying: boolean;
  itemLabeledEnclosures: LabeledItemEnclosure[];
  noticeKey: string | null;
};

export type PlaybackRowActions = {
  pause: () => void;
  playClipById: (idText: string) => Promise<void>;
  playItemById: (idText: string) => Promise<void>;
  resume: () => Promise<void>;
  switchEnclosureSelectedParams: (params: EnclosureSelectedParams) => Promise<void>;
};

type Listener = () => void;

const NO_LABELED_ENCLOSURES: LabeledItemEnclosure[] = [];

let snapshot: PlaybackRowSnapshot = {
  activeMediaId: null,
  enclosureSelectedParams: null,
  isPlaying: false,
  itemLabeledEnclosures: NO_LABELED_ENCLOSURES,
  noticeKey: null,
};
let actions: PlaybackRowActions | null = null;
const listeners = new Set<Listener>();

const isSameSnapshot = (a: PlaybackRowSnapshot, b: PlaybackRowSnapshot): boolean =>
  a.activeMediaId === b.activeMediaId &&
  a.enclosureSelectedParams === b.enclosureSelectedParams &&
  a.isPlaying === b.isPlaying &&
  a.itemLabeledEnclosures === b.itemLabeledEnclosures &&
  a.noticeKey === b.noticeKey;

export const getPlaybackRowSnapshot = (): PlaybackRowSnapshot => snapshot;

export const subscribePlaybackRow = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export function publishPlaybackRow(
  next: PlaybackRowSnapshot,
  nextActions: PlaybackRowActions
): void {
  actions = nextActions;
  if (isSameSnapshot(snapshot, next)) {
    return;
  }
  snapshot = next;
  listeners.forEach((listener) => {
    listener();
  });
}

export function getPlaybackRowActions(): PlaybackRowActions {
  if (actions === null) {
    throw new Error('getPlaybackRowActions ran before PlaybackProvider mounted');
  }
  return actions;
}

export const selectIsActive = (state: PlaybackRowSnapshot, mediaId: string | null): boolean =>
  mediaId !== null && state.activeMediaId === mediaId;

export const selectShowsPause = (state: PlaybackRowSnapshot, mediaId: string | null): boolean =>
  selectIsActive(state, mediaId) && state.isPlaying;

export const selectSelectedParams = (
  state: PlaybackRowSnapshot,
  mediaId: string | null
): EnclosureSelectedParams | undefined =>
  selectIsActive(state, mediaId) && state.enclosureSelectedParams !== null
    ? state.enclosureSelectedParams
    : undefined;

export const selectLabeledEnclosures = (
  state: PlaybackRowSnapshot,
  mediaId: string | null
): LabeledItemEnclosure[] =>
  selectIsActive(state, mediaId) ? state.itemLabeledEnclosures : NO_LABELED_ENCLOSURES;

export function usePlaybackRowIsActive(mediaId: string | null): boolean {
  return useSyncExternalStore(subscribePlaybackRow, () => selectIsActive(snapshot, mediaId));
}

export function usePlaybackRowShowsPause(mediaId: string | null): boolean {
  return useSyncExternalStore(subscribePlaybackRow, () => selectShowsPause(snapshot, mediaId));
}

/** The chosen enclosure while `mediaId` is the loaded item; otherwise undefined. */
export function usePlaybackRowSelectedParams(
  mediaId: string | null
): EnclosureSelectedParams | undefined {
  return useSyncExternalStore(subscribePlaybackRow, () =>
    selectSelectedParams(snapshot, mediaId)
  );
}

export function usePlaybackRowLabeledEnclosures(mediaId: string | null): LabeledItemEnclosure[] {
  return useSyncExternalStore(subscribePlaybackRow, () =>
    selectLabeledEnclosures(snapshot, mediaId)
  );
}

export function usePlaybackNoticeKey(): string | null {
  return useSyncExternalStore(subscribePlaybackRow, () => snapshot.noticeKey);
}
```

## Step 2 — `playbackRowStore.test.ts` (new)

```ts
import { describe, expect, it, vi } from 'vitest';

import type { PlaybackRowActions, PlaybackRowSnapshot } from './playbackRowStore';
import {
  getPlaybackRowSnapshot,
  publishPlaybackRow,
  selectIsActive,
  selectLabeledEnclosures,
  selectSelectedParams,
  selectShowsPause,
  subscribePlaybackRow,
} from './playbackRowStore';

const noopActions: PlaybackRowActions = {
  pause: () => {},
  playClipById: async () => {},
  playItemById: async () => {},
  resume: async () => {},
  switchEnclosureSelectedParams: async () => {},
};

const base: PlaybackRowSnapshot = {
  activeMediaId: 'ep-1',
  enclosureSelectedParams: null,
  isPlaying: true,
  itemLabeledEnclosures: [],
  noticeKey: null,
};

describe('playbackRowStore', () => {
  it('notifies only when a published field changes', () => {
    const listener = vi.fn();
    const unsubscribe = subscribePlaybackRow(listener);
    publishPlaybackRow(base, noopActions);
    expect(listener).toHaveBeenCalledTimes(1);
    publishPlaybackRow({ ...base }, noopActions);
    expect(listener).toHaveBeenCalledTimes(1);
    publishPlaybackRow({ ...base, isPlaying: false }, noopActions);
    expect(listener).toHaveBeenCalledTimes(2);
    expect(getPlaybackRowSnapshot().isPlaying).toBe(false);
    unsubscribe();
  });

  it('answers per row, so only the active row reads as active or paused', () => {
    expect(selectIsActive(base, 'ep-1')).toBe(true);
    expect(selectIsActive(base, 'ep-2')).toBe(false);
    expect(selectIsActive({ ...base, activeMediaId: null }, null)).toBe(false);
    expect(selectShowsPause(base, 'ep-1')).toBe(true);
    expect(selectShowsPause({ ...base, isPlaying: false }, 'ep-1')).toBe(false);
    expect(selectShowsPause(base, 'ep-2')).toBe(false);
    expect(selectSelectedParams(base, 'ep-1')).toBeUndefined();
    expect(selectLabeledEnclosures(base, 'ep-2')).toEqual([]);
  });
});
```

In `apps/mobile/vitest.config.ts`, directly after `      'src/playback/playbackHandoff.test.ts',`
add `      'src/playback/playbackRowStore.test.ts',`.

## Step 3 — `PlaybackProvider.tsx` publishes

3a. In the `from 'react'` import list add `useLayoutEffect,` directly after `useEffect,`.

3b. In the import list ending `} from '../lib/playback/buildPlaybackTarget';` add
`  playbackTargetRowMediaId,` directly above `  playbackTargetToHistoryTarget,`.

3c. Directly above `import { setPlaybackSourceMarker } from './playbackSourceMarker';` add
`import { publishPlaybackRow } from './playbackRowStore';`.

3d. Directly above `  const rowValue = useMemo<PlaybackRowContextValue>(` add:

```tsx
  useLayoutEffect(() => {
    publishPlaybackRow(
      {
        activeMediaId: activeTarget !== null ? playbackTargetRowMediaId(activeTarget) : null,
        enclosureSelectedParams,
        isPlaying,
        itemLabeledEnclosures,
        noticeKey,
      },
      { pause, playClipById, playItemById, resume, switchEnclosureSelectedParams }
    );
  }, [
    activeTarget,
    enclosureSelectedParams,
    isPlaying,
    itemLabeledEnclosures,
    noticeKey,
    pause,
    playClipById,
    playItemById,
    resume,
    switchEnclosureSelectedParams,
  ]);

```

If any of those ten names is not in scope at that point in the provider, stop and report which
one; do not rename or recompute it.

## Do not

- Do not remove `PlaybackRowContext`, `usePlaybackRow`, or `usePlaybackIsPlaying`.
- Do not change any consumer in this milestone (06b does that).

## Done when

- [ ] Two new files exist; vitest line added; Steps 3a–3d applied; Prettier run.
- [ ] COPY-PASTA 06a ticked; this file moved to `.llm/plans/completed/mobile-home-switch-followups/`.

## Operator checkpoint

None. Paste prompt 06b next (06a and 06b are captured together as P6 and C6).
