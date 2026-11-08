import { describe, expect, it } from 'vitest';

import { shouldRequestForegroundSync } from './foregroundAppSync';

describe('shouldRequestForegroundSync', () => {
  it('syncs when the app returns from the background', () => {
    expect(shouldRequestForegroundSync('background', 'active')).toBe(true);
  });

  it('does not sync when an inactive interruption ends', () => {
    expect(shouldRequestForegroundSync('inactive', 'active')).toBe(false);
    expect(shouldRequestForegroundSync('active', 'active')).toBe(false);
    expect(shouldRequestForegroundSync('unknown', 'active')).toBe(false);
    expect(shouldRequestForegroundSync(null, 'active')).toBe(false);
  });

  it('does not sync on the way out', () => {
    expect(shouldRequestForegroundSync('active', 'inactive')).toBe(false);
    expect(shouldRequestForegroundSync('active', 'background')).toBe(false);
    expect(shouldRequestForegroundSync('inactive', 'background')).toBe(false);
    expect(shouldRequestForegroundSync('background', 'inactive')).toBe(false);
  });
});
