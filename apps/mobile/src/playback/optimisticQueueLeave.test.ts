import { describe, expect, it } from 'vitest';

import type { LocalQueueLists, QueueZoneWriteQueue } from '@podverse/playback-core';
import {
  emptyQueueZoneWriteQueue,
  enqueueNextLeave,
  stepLocalQueueNext,
} from '@podverse/playback-core';

type Row = { id: string };

/**
 * A second Next that arrives while the first history post is still queued keeps both left rows
 * and replaces the pending now-playing post with the settled head.
 */
describe('optimistic queue leave while a history post is in flight', () => {
  it('enqueues both left rows and posts now playing only for the settled head', () => {
    let lists: LocalQueueLists<Row> = {
      history: [],
      queue: ['2', '3', '4'].map((id) => ({ id })),
      leaveStack: [],
    };
    let writes: QueueZoneWriteQueue = emptyQueueZoneWriteQueue();

    const first = stepLocalQueueNext(lists, '2');
    expect(first.kind).toBe('advance');
    if (first.kind !== 'advance') {
      return;
    }
    writes = enqueueNextLeave(writes, first.left.id, first.next.id);
    lists = first.lists;
    expect(writes.writes[0]).toEqual({ type: 'history', id: '2' });

    const second = stepLocalQueueNext(lists, lists.queue[0]?.id ?? '');
    expect(second.kind).toBe('advance');
    if (second.kind !== 'advance') {
      return;
    }
    writes = enqueueNextLeave(writes, second.left.id, second.next.id);

    expect(
      writes.writes.filter((write) => write.type === 'history').map((write) => write.id)
    ).toEqual(['2', '3']);
    expect(writes.writes.filter((write) => write.type === 'now-playing')).toEqual([
      { type: 'now-playing', id: '4' },
    ]);
    expect(second.lists.queue[0]?.id).toBe('4');
  });
});
