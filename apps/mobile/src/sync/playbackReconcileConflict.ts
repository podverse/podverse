import type { PlaybackReconcileDifferentNowPlayingConflict } from '../data/repositories/playbackReconcile';

type PlaybackReconcileConflictListener = (
  conflicts: readonly PlaybackReconcileDifferentNowPlayingConflict[]
) => void;

const listeners = new Set<PlaybackReconcileConflictListener>();

let latestConflicts: PlaybackReconcileDifferentNowPlayingConflict[] = [];

const notify = (): void => {
  for (const listener of listeners) {
    listener(latestConflicts);
  }
};

export const publishPlaybackReconcileConflicts = (
  conflicts: readonly PlaybackReconcileDifferentNowPlayingConflict[]
): void => {
  latestConflicts = [...conflicts];
  notify();
};

export const readPlaybackReconcileConflicts =
  (): readonly PlaybackReconcileDifferentNowPlayingConflict[] => {
    return latestConflicts;
  };

export const subscribePlaybackReconcileConflicts = (
  listener: PlaybackReconcileConflictListener
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
