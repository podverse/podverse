type QueueDataRevisionListener = () => void;

const listeners = new Set<QueueDataRevisionListener>();

let revision = 0;

/**
 * Announce that queue data changed — a local queue write or a background reconcile.
 *
 * A screen that reads a queue once on mount would otherwise keep showing what the server had before
 * the change. History is the sharpest case: moving a row back into the queue, or a listen recorded
 * offline that reaches the server after reconnect, has to show up without leaving the screen.
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
