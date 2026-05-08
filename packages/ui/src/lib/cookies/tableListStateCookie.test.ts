import { describe, expect, it } from 'vitest';

import {
  mergeTableListStateCookie,
  readTableListStateMap,
  serializeTableListStateMap,
} from './tableListStateCookie';

describe('readTableListStateMap', () => {
  it('parses known fields and ignores invalid page/limit', () => {
    const raw = serializeTableListStateMap({
      list: {
        search: ' q ',
        columns: 'a,b',
        page: 2,
        limit: 10,
        filters: { status: 'active' },
      },
      badPage: { page: 0 },
      badLimit: { limit: -1 },
    });
    expect(readTableListStateMap(raw)).toEqual({
      list: {
        search: ' q ',
        columns: 'a,b',
        page: 2,
        limit: 10,
        filters: { status: 'active' },
      },
    });
  });
});

describe('mergeTableListStateCookie', () => {
  it('merges patches into one list key while preserving others', () => {
    const first = mergeTableListStateCookie(undefined, 'users', {
      search: 'hello',
      page: 1,
    });
    expect(readTableListStateMap(first).users).toEqual({
      search: 'hello',
      page: 1,
    });

    const second = mergeTableListStateCookie(first, 'users', {
      page: 3,
      columns: 'email',
    });
    expect(readTableListStateMap(second).users).toEqual({
      search: 'hello',
      page: 3,
      columns: 'email',
    });

    const third = mergeTableListStateCookie(second, 'pods', {
      search: 'x',
    });
    const map = readTableListStateMap(third);
    expect(map.users?.search).toBe('hello');
    expect(map.pods?.search).toBe('x');
  });
});
