/**
 * Pending seek while a listener is dragging the full-player scrubber. The engine playhead stays
 * put until they lift; chapter chrome and the left clock follow this value instead.
 */

import { useSyncExternalStore } from 'react';

type Listener = () => void;

let previewSeconds: number | null = null;
const listeners = new Set<Listener>();

const emit = (): void => {
  listeners.forEach((listener) => {
    listener();
  });
};

export const getPlaybackScrubPreviewSeconds = (): number | null => previewSeconds;

export const subscribePlaybackScrubPreview = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const setPlaybackScrubPreviewSeconds = (seconds: number | null): void => {
  const next =
    seconds === null || !Number.isFinite(seconds) ? null : Math.max(0, Math.floor(seconds));
  if (next === previewSeconds) {
    return;
  }
  previewSeconds = next;
  emit();
};

/** Whole-second scrub preview, or `null` when the finger is up. */
export function usePlaybackScrubPreview(): number | null {
  return useSyncExternalStore(
    subscribePlaybackScrubPreview,
    getPlaybackScrubPreviewSeconds,
    getPlaybackScrubPreviewSeconds
  );
}
