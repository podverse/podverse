import { describe, expect, it } from 'vitest';

import { isSyncNetworkUsable } from './offlineMode';

describe('isSyncNetworkUsable', () => {
  it('is true only when the network is reachable and Offline Mode is off', () => {
    expect(isSyncNetworkUsable(true, false)).toBe(true);
    expect(isSyncNetworkUsable(true, true)).toBe(false);
    expect(isSyncNetworkUsable(false, false)).toBe(false);
    expect(isSyncNetworkUsable(false, true)).toBe(false);
  });
});
