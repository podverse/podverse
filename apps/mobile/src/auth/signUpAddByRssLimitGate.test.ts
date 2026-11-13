import { describe, expect, it } from 'vitest';

import { resolveSignUpAddByRssLimitGate } from './signUpAddByRssLimitGate';

describe('resolveSignUpAddByRssLimitGate', () => {
  it('opens sign-up when the device follows no Add by RSS feeds', () => {
    expect(resolveSignUpAddByRssLimitGate({ feedCount: 0, limit: null })).toEqual({
      kind: 'sign_up',
    });
  });

  it('blocks sign-up when the device has feeds and the limit cannot be read', () => {
    expect(resolveSignUpAddByRssLimitGate({ feedCount: 3, limit: null })).toEqual({
      kind: 'limit_unavailable',
    });
  });

  it('opens sign-up when the device is at the limit', () => {
    expect(resolveSignUpAddByRssLimitGate({ feedCount: 3, limit: 3 })).toEqual({
      kind: 'sign_up',
    });
  });

  it('warns when the device is over the limit', () => {
    expect(resolveSignUpAddByRssLimitGate({ feedCount: 4, limit: 3 })).toEqual({
      feedCount: 4,
      kind: 'warn',
      limit: 3,
    });
  });
});
