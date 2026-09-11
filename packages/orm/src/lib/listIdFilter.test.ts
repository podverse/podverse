import { describe, expect, it } from 'vitest';

import { resolveIdListFilter } from './listIdFilter.js';

describe('resolveIdListFilter', () => {
  it('treats an empty include list as empty', () => {
    expect(resolveIdListFilter([], [1]).empty).toBe(true);
  });

  it('subtracts excludes from includes', () => {
    const result = resolveIdListFilter([1, 2, 3], [2]);
    expect(result.empty).toBe(false);
    expect(result).toHaveProperty('id');
  });

  it('returns empty when every include is excluded', () => {
    expect(resolveIdListFilter([1], [1]).empty).toBe(true);
  });

  it('keeps a not-in filter when only excludes are present', () => {
    const result = resolveIdListFilter(undefined, [4, 5]);
    expect(result.empty).toBe(false);
    expect(result).toHaveProperty('id');
  });
});
