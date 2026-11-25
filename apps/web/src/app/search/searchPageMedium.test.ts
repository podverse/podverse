import { describe, expect, it } from 'vitest';

import { searchMediumForCatalog } from './searchPageMedium';

describe('searchMediumForCatalog', () => {
  it('resolves a null store to all whether Music is on or off', () => {
    expect(searchMediumForCatalog(null, true)).toBe('all');
    expect(searchMediumForCatalog(null, false)).toBe('all');
    expect(searchMediumForCatalog(undefined, false)).toBe('all');
  });

  it('keeps a stored music choice when Music is on and opens all when Music is off', () => {
    expect(searchMediumForCatalog({ type: 'music' }, true)).toBe('music');
    expect(searchMediumForCatalog({ type: 'music' }, false)).toBe('all');
  });

  it('keeps a stored all choice when Music is off', () => {
    expect(searchMediumForCatalog({ type: 'all' }, false)).toBe('all');
  });
});
