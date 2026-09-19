import type { PlaybackReconcileResourceState } from '../data/repositories/playbackReconcile';

type PlaybackPositionAdoptionListener = (
  adoptions: readonly PlaybackReconcileResourceState[]
) => void;

const listeners = new Set<PlaybackPositionAdoptionListener>();

/**
 * Positions another device advanced on the resource this device also has loaded, waiting for the
 * player to move to them.
 *
 * A signal rather than a return value because reconcile runs in the background sync queue, which has
 * no way to reach the player: the queue owns data, and the player owns the engine. Delivered as the
 * latest set rather than a stream of events — a later reconcile supersedes an earlier one, and there
 * is no value in replaying a position that has already been overtaken.
 */
let latestAdoptions: PlaybackReconcileResourceState[] = [];

export const publishPlaybackPositionAdoptions = (
  adoptions: readonly PlaybackReconcileResourceState[]
): void => {
  latestAdoptions = [...adoptions];
  for (const listener of listeners) {
    listener(latestAdoptions);
  }
};

export const readPlaybackPositionAdoptions = (): readonly PlaybackReconcileResourceState[] => {
  return latestAdoptions;
};

export const subscribePlaybackPositionAdoptions = (
  listener: PlaybackPositionAdoptionListener
): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
