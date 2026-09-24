export const QUEUE_DATA_CHANGED_EVENT = 'podverse:queue-data-changed';

export type QueueDataChangedDetail = {
  queueResourceId: number | null;
};

function readQueueResourceId(result: unknown): number | null {
  if (typeof result !== 'object' || result === null || !('id' in result)) {
    return null;
  }
  const id = result.id;
  return typeof id === 'number' && Number.isFinite(id) ? id : null;
}

/**
 * Tell open queue surfaces that a queue write succeeded. History drops `queueResourceId`
 * immediately — that row just moved to a single new list position — then refetches.
 */
export function emitQueueDataChangedEvent(result?: unknown): void {
  if (typeof window === 'undefined') {
    return;
  }
  const detail: QueueDataChangedDetail = {
    queueResourceId: readQueueResourceId(result),
  };
  window.dispatchEvent(
    new CustomEvent<QueueDataChangedDetail>(QUEUE_DATA_CHANGED_EVENT, { detail })
  );
}

export function queueResourceIdFromChangeEvent(event: Event): number | null {
  if (!(event instanceof CustomEvent)) {
    return null;
  }
  const detail: unknown = event.detail;
  if (typeof detail !== 'object' || detail === null || !('queueResourceId' in detail)) {
    return null;
  }
  const queueResourceId = detail.queueResourceId;
  return typeof queueResourceId === 'number' && Number.isFinite(queueResourceId)
    ? queueResourceId
    : null;
}
