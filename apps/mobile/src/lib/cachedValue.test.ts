import { describe, expect, it } from 'vitest';

import { shouldReplaceCachedValue } from './cachedValue';

describe('shouldReplaceCachedValue', () => {
  it('replaces when nothing is on screen yet', () => {
    expect(shouldReplaceCachedValue(null, { title: 'Fresh' })).toBe(true);
  });

  it('keeps the cached value when the server copy is identical', () => {
    const cached = { title: 'Same', duration: 60 };
    expect(shouldReplaceCachedValue(cached, { title: 'Same', duration: 60 })).toBe(false);
  });

  it('replaces when the server copy differs', () => {
    expect(shouldReplaceCachedValue({ title: 'Old' }, { title: 'New' })).toBe(true);
  });
});
