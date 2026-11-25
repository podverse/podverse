/**
 * One local queue step per Next or Previous tap.
 *
 * `queue` index 0 is now playing. Later indexes are upcoming, front first.
 * `history` and `leaveStack` are newest first. The leave stack is only the rows
 * this session moved out with Next or a natural end. Previous walks that stack.
 * A row Previous restores is demoted to the front of upcoming, not into history.
 */

export type LocalQueueRow = {
  id: string;
};

export type LocalQueueLists<T extends LocalQueueRow> = {
  history: T[];
  queue: T[];
  leaveStack: string[];
};

export type LocalQueueNextStep<T extends LocalQueueRow> =
  | { kind: 'fetch' }
  | { kind: 'none' }
  | {
      kind: 'advance';
      left: T;
      next: T;
      lists: LocalQueueLists<T>;
    };

export type LocalQueuePreviousStep<T extends LocalQueueRow> =
  | { kind: 'auto-queue' }
  | {
      kind: 'advance';
      demoted: T;
      restored: T;
      lists: LocalQueueLists<T>;
    };

export type LocalQueuePreviousResolution<T extends LocalQueueRow> =
  { kind: 'restart' } | LocalQueuePreviousStep<T>;

export function stepLocalQueueNext<T extends LocalQueueRow>(
  lists: LocalQueueLists<T>,
  playingId: string
): LocalQueueNextStep<T> {
  const head = lists.queue[0];
  if (head === undefined || head.id !== playingId) {
    return { kind: 'fetch' };
  }
  const next = lists.queue[1];
  if (next === undefined) {
    return { kind: 'none' };
  }
  return {
    kind: 'advance',
    left: head,
    next,
    lists: {
      history: [head, ...lists.history.filter((row) => row.id !== head.id)],
      queue: lists.queue.slice(1),
      leaveStack: [head.id, ...lists.leaveStack.filter((id) => id !== head.id)],
    },
  };
}

/**
 * Past the restart window the caller seeks to the start of the current item.
 * Inside the window, Previous walks the session leave stack.
 */
export function resolveLocalPrevious<T extends LocalQueueRow>(
  lists: LocalQueueLists<T>,
  withinGrace: boolean
): LocalQueuePreviousResolution<T> {
  if (!withinGrace) {
    return { kind: 'restart' };
  }
  return stepLocalQueuePrevious(lists);
}

export function stepLocalQueuePrevious<T extends LocalQueueRow>(
  lists: LocalQueueLists<T>
): LocalQueuePreviousStep<T> {
  const restoredId = lists.leaveStack[0];
  const current = lists.queue[0];
  if (restoredId === undefined || current === undefined) {
    return { kind: 'auto-queue' };
  }
  const restored = lists.history.find((row) => row.id === restoredId);
  if (restored === undefined) {
    return { kind: 'auto-queue' };
  }
  const upcoming = lists.queue.slice(1).filter((row) => row.id !== current.id);
  return {
    kind: 'advance',
    demoted: current,
    restored,
    lists: {
      history: lists.history.filter((row) => row.id !== restoredId),
      queue: [restored, current, ...upcoming],
      leaveStack: lists.leaveStack.slice(1),
    },
  };
}

/**
 * Background zone posts. History does not promote the next upcoming row, so a
 * Next burst keeps one history post per left row and replaces the pending
 * now-playing post until the head settles. Previous posts upcoming-front for a
 * row that already landed as now playing, and now-playing for the restored row.
 */
export type QueueZoneWrite =
  | { type: 'history'; id: string }
  | { type: 'now-playing'; id: string }
  | { type: 'upcoming-front'; id: string };

export type QueueZoneWriteQueue = {
  flushedNowPlayingId: string | null;
  writes: QueueZoneWrite[];
};

export function emptyQueueZoneWriteQueue(): QueueZoneWriteQueue {
  return { flushedNowPlayingId: null, writes: [] };
}

export function enqueueNextLeave(
  queue: QueueZoneWriteQueue,
  leftId: string,
  headId: string
): QueueZoneWriteQueue {
  const writes = queue.writes.filter(
    (write) =>
      write.type !== 'now-playing' && !(write.type === 'upcoming-front' && write.id === headId)
  );
  return {
    flushedNowPlayingId: queue.flushedNowPlayingId,
    writes: [...writes, { type: 'history', id: leftId }, { type: 'now-playing', id: headId }],
  };
}

export function enqueuePreviousRestore(
  queue: QueueZoneWriteQueue,
  demotedId: string,
  restoredId: string
): QueueZoneWriteQueue {
  const writes = queue.writes.filter(
    (write) =>
      write.type !== 'now-playing' &&
      !(write.type === 'history' && write.id === restoredId) &&
      !(write.type === 'upcoming-front' && write.id === restoredId)
  );
  const demotedIsServerNowPlaying = queue.flushedNowPlayingId === demotedId;
  const withDemotion = demotedIsServerNowPlaying
    ? [...writes, { type: 'upcoming-front' as const, id: demotedId }]
    : writes;
  return {
    flushedNowPlayingId: queue.flushedNowPlayingId,
    writes: [...withDemotion, { type: 'now-playing', id: restoredId }],
  };
}

function sameZoneWrite(left: QueueZoneWrite, right: QueueZoneWrite): boolean {
  return left.type === right.type && left.id === right.id;
}

/**
 * Records a post that finished. A now-playing post that is no longer the settled
 * head is moved to the front of upcoming when nothing is about to history that
 * same row. A history post already queued for it is left to take it out.
 */
export function noteQueueZoneWritePosted(
  queue: QueueZoneWriteQueue,
  write: QueueZoneWrite
): QueueZoneWriteQueue {
  const head = queue.writes[0];
  const headMatches = head !== undefined && sameZoneWrite(head, write);
  let writes = headMatches ? queue.writes.slice(1) : queue.writes;
  if (write.type !== 'now-playing') {
    return { flushedNowPlayingId: queue.flushedNowPlayingId, writes };
  }
  const desiredNowPlaying = [...writes].reverse().find((entry) => entry.type === 'now-playing');
  const pendingHistory = writes.some((entry) => entry.type === 'history' && entry.id === write.id);
  const headMovedOn =
    desiredNowPlaying !== undefined && desiredNowPlaying.id !== write.id && !pendingHistory;
  if (headMovedOn) {
    const withoutSameFront = writes.filter(
      (entry) => !(entry.type === 'upcoming-front' && entry.id === write.id)
    );
    writes = [{ type: 'upcoming-front', id: write.id }, ...withoutSameFront];
  }
  return { flushedNowPlayingId: write.id, writes };
}
