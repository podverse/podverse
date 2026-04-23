import { describe, expect, it } from 'vitest';

import { checkAdminAccountSelfAccess } from './adminSelfOnly.js';

describe('checkAdminAccountSelfAccess', () => {
  it('allows when session user id matches requested admin id', () => {
    expect(checkAdminAccountSelfAccess(42, 42)).toEqual({ allowed: true });
  });

  it('returns forbidden when ids differ', () => {
    expect(checkAdminAccountSelfAccess(1, 2)).toEqual({
      allowed: false,
      reason: 'forbidden',
    });
  });

  it('returns unauthenticated when session user id is undefined', () => {
    expect(checkAdminAccountSelfAccess(undefined, 1)).toEqual({
      allowed: false,
      reason: 'unauthenticated',
    });
  });

  it('returns unauthenticated when session user id is NaN', () => {
    expect(checkAdminAccountSelfAccess(Number.NaN, 1)).toEqual({
      allowed: false,
      reason: 'unauthenticated',
    });
  });
});
