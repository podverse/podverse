import { describe, expect, it } from 'vitest';

import {
  assertValidMonthsToAdd,
  calculateMembershipExpirationDate,
} from './membershipClaimToken.helpers.js';

describe('membershipClaimToken helpers', () => {
  it('rejects invalid month values', () => {
    expect(() => assertValidMonthsToAdd(0)).toThrow('months_to_add must be an integer 1 or larger');
    expect(() => assertValidMonthsToAdd(-1)).toThrow(
      'months_to_add must be an integer 1 or larger'
    );
    expect(() => assertValidMonthsToAdd(1.5)).toThrow(
      'months_to_add must be an integer 1 or larger'
    );
  });

  it('adds months to existing membership expiration date', () => {
    const membershipExpiresAt = new Date('2026-04-01T00:00:00.000Z');
    const expiration = calculateMembershipExpirationDate(membershipExpiresAt, 2);
    expect(expiration.toISOString()).toBe('2026-06-01T00:00:00.000Z');
  });

  it('uses provided current time when membership expiration is absent', () => {
    const now = new Date('2026-01-15T00:00:00.000Z');
    const expiration = calculateMembershipExpirationDate(undefined, 1, now);
    expect(expiration.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });
});
