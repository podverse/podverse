import { describe, expect, it } from 'vitest';

import { moveItem } from './moveItem';

describe('moveItem', () => {
  it('moves an item to a new index after removal', () => {
    expect(moveItem(['a', 'b', 'c', 'd'], 0, 2)).toEqual(['b', 'c', 'a', 'd']);
    expect(moveItem(['a', 'b', 'c', 'd'], 3, 0)).toEqual(['d', 'a', 'b', 'c']);
    expect(moveItem(['a', 'b', 'c'], 1, 1)).toEqual(['a', 'b', 'c']);
  });

  it('clamps an out-of-range destination to the end', () => {
    expect(moveItem(['a', 'b', 'c'], 0, 99)).toEqual(['b', 'c', 'a']);
  });

  it('returns a copy when the source index is invalid', () => {
    const list = ['a', 'b'];
    const next = moveItem(list, -1, 0);
    expect(next).toEqual(['a', 'b']);
    expect(next).not.toBe(list);
  });
});
