import type { DTOQueueResourceAbridgedResponseData } from '@podverse/helpers/dto';

/** Queue resource kinds that carry a completed flag. */
export type QueueCompletionKind = 'item' | 'clip' | 'soundbite' | 'add_by_rss';

/**
 * Identity a list row uses to read completion. `numericId` matches abridged `t` / `c` / `s`.
 * Add by RSS uses `idText` as the hash and leaves `numericId` null. An explicit override is
 * keyed by `kind` + `idText` and wins over the abridged snapshot for the rest of the session.
 */
export type QueueCompletionKey = {
  kind: QueueCompletionKind;
  idText: string;
  numericId: number | null;
};

type Listener = () => void;

let abridgedCompleted = new Map<string, true>();
let completionOverrides = new Map<string, boolean>();
const listeners = new Set<Listener>();

const abridgedStorageKey = (kind: QueueCompletionKind, id: number | string): string => {
  return `${kind}:${String(id)}`;
};

const overrideStorageKey = (kind: QueueCompletionKind, idText: string): string => {
  return `${kind}:${idText}`;
};

const emitQueueCompletion = (): void => {
  for (const listener of listeners) {
    listener();
  }
};

const sameCompletedSet = (left: Map<string, true>, right: Map<string, true>): boolean => {
  if (left.size !== right.size) {
    return false;
  }
  for (const key of left.keys()) {
    if (!right.has(key)) {
      return false;
    }
  }
  return true;
};

/** Replace the abridged completion snapshot. Rows whose `z` is not true drop out. */
export const publishQueueCompletionFromAbridged = (
  rows: readonly DTOQueueResourceAbridgedResponseData[]
): void => {
  const next = new Map<string, true>();
  for (const row of rows) {
    if (row.z !== true) {
      continue;
    }
    if (typeof row.c === 'number') {
      next.set(abridgedStorageKey('clip', row.c), true);
    } else if (typeof row.s === 'number') {
      next.set(abridgedStorageKey('soundbite', row.s), true);
    } else if (typeof row.a === 'string' && row.a.length > 0) {
      next.set(abridgedStorageKey('add_by_rss', row.a), true);
    } else if (typeof row.t === 'number') {
      next.set(abridgedStorageKey('item', row.t), true);
    }
  }
  if (sameCompletedSet(abridgedCompleted, next)) {
    return;
  }
  abridgedCompleted = next;
  emitQueueCompletion();
};

/**
 * Session override for Mark as Played / Mark as Unplayed. A later abridged refresh does not
 * clear it. Playback that itself completes may set it true again.
 */
export const setQueueCompletionOverride = (
  kind: QueueCompletionKind,
  idText: string,
  completed: boolean
): void => {
  if (idText.length === 0) {
    return;
  }
  const key = overrideStorageKey(kind, idText);
  if (completionOverrides.get(key) === completed) {
    return;
  }
  const next = new Map(completionOverrides);
  next.set(key, completed);
  completionOverrides = next;
  emitQueueCompletion();
};

/** Record completion from a playback event whose own `completed` flag is true. */
export const noteQueueCompletionFromPlayback = (
  kind: QueueCompletionKind,
  idText: string
): void => {
  setQueueCompletionOverride(kind, idText, true);
};

/** Drop abridged rows and overrides when the signed-in session ends. */
export const resetQueueCompletionStore = (): void => {
  if (abridgedCompleted.size === 0 && completionOverrides.size === 0) {
    return;
  }
  abridgedCompleted = new Map();
  completionOverrides = new Map();
  emitQueueCompletion();
};

export const subscribeQueueCompletion = (listener: Listener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};

/** Explicit override wins. Otherwise the abridged snapshot for this id. */
export const readQueueCompletion = (key: QueueCompletionKey | null): boolean => {
  if (key === null || key.idText.length === 0) {
    return false;
  }
  const override = completionOverrides.get(overrideStorageKey(key.kind, key.idText));
  if (override !== undefined) {
    return override;
  }
  if (key.kind === 'add_by_rss') {
    return abridgedCompleted.has(abridgedStorageKey('add_by_rss', key.idText));
  }
  if (key.numericId === null) {
    return false;
  }
  return abridgedCompleted.has(abridgedStorageKey(key.kind, key.numericId));
};
