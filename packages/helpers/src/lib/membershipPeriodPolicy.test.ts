import { describe, expect, it } from 'vitest';

import {
  extendMembershipPeriodByCadence,
  extendMembershipPeriodByMonths,
  resolveMembershipExtensionBaseDate,
} from './membershipPeriodPolicy.js';

describe('membershipPeriodPolicy', () => {
  it('extends from active expiry, not now', () => {
    const now = new Date('2026-01-15T00:00:00.000Z');
    const activeExpiry = new Date('2026-06-01T00:00:00.000Z');

    const next = extendMembershipPeriodByMonths({
      membershipExpiresAt: activeExpiry,
      monthsToAdd: 1,
      now,
    });

    expect(next.toISOString()).toBe('2026-07-01T00:00:00.000Z');
  });

  it('extends from now when expiry is unset or expired', () => {
    const now = new Date('2026-01-15T00:00:00.000Z');

    const unset = extendMembershipPeriodByMonths({
      membershipExpiresAt: null,
      monthsToAdd: 1,
      now,
    });
    expect(unset.toISOString()).toBe('2026-02-15T00:00:00.000Z');

    const expired = extendMembershipPeriodByMonths({
      membershipExpiresAt: new Date('2026-01-01T00:00:00.000Z'),
      monthsToAdd: 1,
      now,
    });
    expect(expired.toISOString()).toBe('2026-02-15T00:00:00.000Z');
  });

  it('applies monthly calendar clamp at month end', () => {
    const now = new Date('2026-01-31T00:00:00.000Z');

    const feb = extendMembershipPeriodByCadence({
      membershipExpiresAt: null,
      cadence: 'monthly',
      now,
    });
    expect(feb.toISOString()).toBe('2026-02-28T00:00:00.000Z');

    const mar = extendMembershipPeriodByMonths({
      membershipExpiresAt: null,
      monthsToAdd: 2,
      now,
    });
    expect(mar.toISOString()).toBe('2026-03-31T00:00:00.000Z');
  });

  it('handles leap-year annual boundaries deterministically', () => {
    const leapDay = new Date('2024-02-29T12:00:00.000Z');
    const annual = extendMembershipPeriodByCadence({
      membershipExpiresAt: leapDay,
      cadence: 'annual',
      now: new Date('2024-02-01T00:00:00.000Z'),
    });

    expect(annual.toISOString()).toBe('2025-02-28T12:00:00.000Z');
  });

  it('returns current active expiry as extension base when active', () => {
    const now = new Date('2026-01-01T00:00:00.000Z');
    const active = new Date('2026-01-20T00:00:00.000Z');

    const base = resolveMembershipExtensionBaseDate(active, now);
    expect(base.toISOString()).toBe('2026-01-20T00:00:00.000Z');
  });
});
