import { describe, expect, it } from 'vitest';

import {
  emptyQueueZoneWriteQueue,
  enqueueNextLeave,
  enqueuePreviousRestore,
  type LocalQueueLists,
  noteQueueZoneWritePosted,
  type QueueZoneWriteQueue,
  resolveLocalPrevious,
  stepLocalQueueNext,
} from '../localQueueLeave.js';

type Row = { id: string };

const row = (id: string): Row => ({ id });

const queueOf = (ids: string[]): LocalQueueLists<Row> => ({
  history: [],
  queue: ids.map(row),
  leaveStack: [],
});

const historyIds = (queue: QueueZoneWriteQueue): string[] =>
  queue.writes.filter((write) => write.type === 'history').map((write) => write.id);

const nowPlayingIds = (queue: QueueZoneWriteQueue): string[] =>
  queue.writes.filter((write) => write.type === 'now-playing').map((write) => write.id);

describe('stepLocalQueueNext', () => {
  it('moves the head into history and leaves the next row playing', () => {
    const step = stepLocalQueueNext(queueOf(['2', '3', '4']), '2');
    expect(step.kind).toBe('advance');
    if (step.kind !== 'advance') {
      return;
    }
    expect(step.left.id).toBe('2');
    expect(step.next.id).toBe('3');
    expect(step.lists.queue.map((entry) => entry.id)).toEqual(['3', '4']);
    expect(step.lists.history.map((entry) => entry.id)).toEqual(['2']);
    expect(step.lists.leaveStack).toEqual(['2']);
  });

  it('lands on track 8 after six Next taps from track 2 and histories every left row', () => {
    let lists = queueOf(['2', '3', '4', '5', '6', '7', '8', '9']);
    let writes = emptyQueueZoneWriteQueue();
    for (let tap = 0; tap < 6; tap += 1) {
      const playingId = lists.queue[0]?.id;
      expect(playingId).toBeDefined();
      if (playingId === undefined) {
        return;
      }
      const step = stepLocalQueueNext(lists, playingId);
      expect(step.kind).toBe('advance');
      if (step.kind !== 'advance') {
        return;
      }
      writes = enqueueNextLeave(writes, step.left.id, step.next.id);
      lists = step.lists;
    }
    expect(lists.queue[0]?.id).toBe('8');
    expect(lists.history.map((entry) => entry.id)).toEqual(['7', '6', '5', '4', '3', '2']);
    expect(historyIds(writes)).toEqual(['2', '3', '4', '5', '6', '7']);
    expect(nowPlayingIds(writes)).toEqual(['8']);
  });

  it('asks for a fetch when the playing id is not the queue head', () => {
    expect(stepLocalQueueNext(queueOf(['2', '3']), '9').kind).toBe('fetch');
  });

  it('reports no buffered next row when upcoming is empty', () => {
    expect(stepLocalQueueNext(queueOf(['2']), '2').kind).toBe('none');
  });
});

describe('resolveLocalPrevious', () => {
  it('restarts when playback is past the grace window', () => {
    expect(resolveLocalPrevious(queueOf(['2', '3']), false).kind).toBe('restart');
  });

  it('uses auto-queue when this session has not left a row', () => {
    expect(resolveLocalPrevious(queueOf(['2', '3']), true).kind).toBe('auto-queue');
  });

  it('demotes the current row to the front of upcoming and restores the leave stack', () => {
    let lists = queueOf(['2', '3', '4', '5', '6', '7', '8', '9']);
    let writes = emptyQueueZoneWriteQueue();
    for (let tap = 0; tap < 6; tap += 1) {
      const playingId = lists.queue[0]?.id ?? '';
      const step = stepLocalQueueNext(lists, playingId);
      if (step.kind !== 'advance') {
        throw new Error('expected advance');
      }
      writes = enqueueNextLeave(writes, step.left.id, step.next.id);
      lists = step.lists;
    }
    const previous = resolveLocalPrevious(lists, true);
    expect(previous.kind).toBe('advance');
    if (previous.kind !== 'advance') {
      return;
    }
    expect(previous.restored.id).toBe('7');
    expect(previous.demoted.id).toBe('8');
    expect(previous.lists.queue.map((entry) => entry.id).slice(0, 3)).toEqual(['7', '8', '9']);
    expect(previous.lists.history.map((entry) => entry.id)).toEqual(['6', '5', '4', '3', '2']);
    writes = enqueuePreviousRestore(writes, previous.demoted.id, previous.restored.id);
    expect(historyIds(writes)).toEqual(['2', '3', '4', '5', '6']);
    expect(nowPlayingIds(writes)).toEqual(['7']);
    expect(writes.writes.some((write) => write.type === 'upcoming-front')).toBe(false);

    const again = stepLocalQueueNext(previous.lists, '7');
    expect(again.kind).toBe('advance');
    if (again.kind !== 'advance') {
      return;
    }
    expect(again.next.id).toBe('8');
  });

  it('posts the demoted row to the front of upcoming only after it landed as now playing', () => {
    const flushed: QueueZoneWriteQueue = {
      flushedNowPlayingId: '8',
      writes: [],
    };
    const writes = enqueuePreviousRestore(flushed, '8', '7');
    expect(writes.writes).toEqual([
      { type: 'upcoming-front', id: '8' },
      { type: 'now-playing', id: '7' },
    ]);
  });
});

describe('noteQueueZoneWritePosted', () => {
  it('moves a finished now-playing post to upcoming when the head has already changed', () => {
    const posted = noteQueueZoneWritePosted(
      {
        flushedNowPlayingId: null,
        writes: [{ type: 'now-playing', id: '7' }],
      },
      { type: 'now-playing', id: '8' }
    );
    expect(posted.flushedNowPlayingId).toBe('8');
    expect(posted.writes).toEqual([
      { type: 'upcoming-front', id: '8' },
      { type: 'now-playing', id: '7' },
    ]);
  });

  it('leaves a history post in place when the row was left again after the now-playing post started', () => {
    const posted = noteQueueZoneWritePosted(
      {
        flushedNowPlayingId: null,
        writes: [
          { type: 'history', id: '3' },
          { type: 'now-playing', id: '4' },
        ],
      },
      { type: 'now-playing', id: '3' }
    );
    expect(posted.writes).toEqual([
      { type: 'history', id: '3' },
      { type: 'now-playing', id: '4' },
    ]);
  });
});
