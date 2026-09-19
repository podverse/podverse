type QueueDataRevisionListener = () => void;

const listeners = new Set<QueueDataRevisionListener>();

let revision = 0;

/**
 * Announce that background sync has rewritten queue data — now-playing, upcoming, or history.
 *
 * A screen that reads a queue once on mount would otherwise keep showing what the server had before
 * a reconcile landed. History is the sharpest case: a listen recorded offline reaches the server
 * seconds after reconnecting, and without this signal the screen sits on an empty state that never
 * corrects itself.
 *
 * The payload is a bare counter rather than the rows, so publishing stays cheap and every consumer
 * refetches only what it renders.
 */
export const publishQueueDataChanged = (): void => {
  revision += 1;
  for (const listener of listeners) {
    listener();
  }
};

export const readQueueDataRevision = (): number => {
  return revision;
};

export const subscribeQueueDataRevision = (listener: QueueDataRevisionListener): (() => void) => {
  listeners.add(listener);
  return () => {
    listeners.delete(listener);
  };
};
