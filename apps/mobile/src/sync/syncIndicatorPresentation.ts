import { useSyncExternalStore } from 'react';

import type { SyncIndicatorGateState } from './syncIndicatorGate';
import { createSyncIndicatorGateState, reduceSyncIndicatorGate } from './syncIndicatorGate';
import type { SyncQueueState } from './syncQueue';

/**
 * What the sync progress row paints.
 *
 * The queue drops its active label for one notification between jobs while the run is still going.
 * Due follows `status === 'running'` across that gap, or the show delay would restart at every job
 * and a long run of short jobs would never appear. The last label and counts stay through the hold
 * after the queue goes idle, which is the only stretch with nothing live to read.
 */

export type SyncIndicatorPresentation = {
  completedCount: number;
  labelKey: string | null;
  totalCount: number;
  visible: boolean;
};

const HIDDEN: SyncIndicatorPresentation = {
  completedCount: 0,
  labelKey: null,
  totalCount: 0,
  visible: false,
};

type HeldProgress = {
  completedCount: number;
  labelKey: string | null;
  totalCount: number;
};

let gate: SyncIndicatorGateState = createSyncIndicatorGateState();
let held: HeldProgress = { completedCount: 0, labelKey: null, totalCount: 0 };
let presentation: SyncIndicatorPresentation = HIDDEN;
let wakeTimer: ReturnType<typeof setTimeout> | null = null;
let lastDue = false;
const listeners = new Set<() => void>();

const emit = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const publish = (next: SyncIndicatorPresentation): void => {
  if (
    presentation.visible === next.visible &&
    presentation.labelKey === next.labelKey &&
    presentation.completedCount === next.completedCount &&
    presentation.totalCount === next.totalCount
  ) {
    return;
  }
  presentation = next.visible ? next : HIDDEN;
  emit();
};

const apply = (due: boolean, now: number): void => {
  lastDue = due;
  const stepped = reduceSyncIndicatorGate(gate, { due, now });
  gate = stepped.state;

  if (wakeTimer !== null) {
    clearTimeout(wakeTimer);
    wakeTimer = null;
  }

  if (stepped.wakeAt !== null) {
    const delay = Math.max(0, stepped.wakeAt - now);
    wakeTimer = setTimeout(() => {
      wakeTimer = null;
      apply(lastDue, Date.now());
    }, delay);
  }

  if (!gate.visible || held.labelKey === null) {
    publish(HIDDEN);
    return;
  }

  publish({
    completedCount: held.completedCount,
    labelKey: held.labelKey,
    totalCount: held.totalCount,
    visible: true,
  });
};

/** Feed the latest queue state. Safe to call on every notification, including the gap between jobs. */
export const publishSyncIndicatorQueueState = (state: SyncQueueState, now = Date.now()): void => {
  if (state.status === 'running' && state.activeLabelKey !== null) {
    held = {
      completedCount: state.completedCount,
      labelKey: state.activeLabelKey,
      totalCount: state.totalCount,
    };
  } else if (state.status === 'idle' && held.labelKey !== null) {
    // The idle snapshot zeroes its counts. The hold keeps the last label and shows the run as
    // finished.
    held = { ...held, completedCount: held.totalCount };
  }
  apply(state.status === 'running', now);
};

export const getSyncIndicatorPresentation = (): SyncIndicatorPresentation => presentation;

export const subscribeSyncIndicatorPresentation = (listener: () => void): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

export const useSyncIndicatorPresentation = (): SyncIndicatorPresentation =>
  useSyncExternalStore(
    subscribeSyncIndicatorPresentation,
    getSyncIndicatorPresentation,
    getSyncIndicatorPresentation
  );
