import { describe, expect, it } from 'vitest';

import type { DTOQueueResourceAbridgedResponseData } from '@podverse/helpers/dto';

import {
  noteQueueCompletionFromPlayback,
  publishQueueCompletionFromAbridged,
  readQueueCompletion,
  resetQueueCompletionStore,
  setQueueCompletionOverride,
  subscribeQueueCompletion,
} from './queueCompletionStore';

const itemRow = (itemId: number, completed: boolean): DTOQueueResourceAbridgedResponseData => ({
  d: '60',
  i: itemId,
  p: '0',
  t: itemId,
  z: completed,
});

describe('queueCompletionStore', () => {
  it('reads abridged completion, lets an unplayed override hide it, and clears on reset', () => {
    resetQueueCompletionStore();
    const notifications: number[] = [];
    const unsubscribe = subscribeQueueCompletion(() => {
      notifications.push(notifications.length + 1);
    });

    publishQueueCompletionFromAbridged([itemRow(8, true), itemRow(9, false)]);
    expect(readQueueCompletion({ idText: 'ep-8', kind: 'item', numericId: 8 })).toBe(true);
    expect(readQueueCompletion({ idText: 'ep-9', kind: 'item', numericId: 9 })).toBe(false);

    publishQueueCompletionFromAbridged([itemRow(8, true), itemRow(9, false)]);
    expect(notifications).toEqual([1]);

    setQueueCompletionOverride('item', 'ep-8', false);
    expect(readQueueCompletion({ idText: 'ep-8', kind: 'item', numericId: 8 })).toBe(false);

    noteQueueCompletionFromPlayback('item', 'ep-8');
    expect(readQueueCompletion({ idText: 'ep-8', kind: 'item', numericId: 8 })).toBe(true);

    resetQueueCompletionStore();
    expect(readQueueCompletion({ idText: 'ep-8', kind: 'item', numericId: 8 })).toBe(false);

    unsubscribe();
    resetQueueCompletionStore();
  });

  it('matches an Add by RSS hash without a numeric id', () => {
    resetQueueCompletionStore();
    publishQueueCompletionFromAbridged([{ a: 'hash-played', d: '10', i: 1, p: '0', z: true }]);

    expect(
      readQueueCompletion({ idText: 'hash-played', kind: 'add_by_rss', numericId: null })
    ).toBe(true);
    expect(readQueueCompletion({ idText: 'hash-other', kind: 'add_by_rss', numericId: null })).toBe(
      false
    );

    resetQueueCompletionStore();
  });
});
