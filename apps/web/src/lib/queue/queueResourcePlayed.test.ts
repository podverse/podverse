import { describe, expect, it } from 'vitest';

import type { QueueResourcesAbridgedIndex } from '@podverse/helpers';

import {
  applyQueueResourcePlayed,
  isAnyAddByRssHashPlayed,
  isQueueResourcePlayed,
} from './queueResourcePlayed';

const emptyIndex = (): QueueResourcesAbridgedIndex => ({
  add_by_rss_resource_datas: {},
  clips: {},
  item_soundbites: {},
  items: {
    4: { d: '90', p: '12', z: false },
  },
});

describe('applyQueueResourcePlayed', () => {
  it('marks the item played, keeps its duration, and leaves other buckets alone', () => {
    const next = applyQueueResourcePlayed(emptyIndex(), {
      duration: '30',
      id: 4,
      kind: 'item',
    });

    expect(next.items[4]).toEqual({ d: '90', i: 4, p: '0', z: true });
    expect(next.clips).toEqual({});
    expect(isQueueResourcePlayed(next, { id: 4, kind: 'item' })).toBe(true);
    expect(isQueueResourcePlayed(emptyIndex(), { id: 4, kind: 'item' })).toBe(false);
  });

  it('uses the given duration when the index has no row yet', () => {
    const next = applyQueueResourcePlayed(emptyIndex(), {
      duration: '40',
      hash: 'hash-1',
      kind: 'add_by_rss',
    });

    expect(next.add_by_rss_resource_datas['hash-1']).toEqual({
      a: 'hash-1',
      d: '40',
      p: '0',
      z: true,
    });
    expect(isAnyAddByRssHashPlayed(next, ['missing', 'hash-1'])).toBe(true);
    expect(isAnyAddByRssHashPlayed(next, ['missing'])).toBe(false);
    expect(isAnyAddByRssHashPlayed(next, undefined)).toBe(false);
  });
});
