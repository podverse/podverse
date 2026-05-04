import { describe, expect, it, vi } from 'vitest';

import { hasValidMembership, isMembershipExpiredAt } from './accountMembership.js';

describe('isMembershipExpiredAt', () => {
  it('returns false for null and undefined', () => {
    expect(isMembershipExpiredAt(null)).toBe(false);
    expect(isMembershipExpiredAt(undefined)).toBe(false);
  });

  it('returns true when the expiry is strictly before now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    expect(isMembershipExpiredAt('2026-05-01T12:00:00.000Z')).toBe(true);
    vi.useRealTimers();
  });

  it('returns false when the expiry is at or after now', () => {
    vi.useFakeTimers();
    vi.setSystemTime(new Date('2026-06-01T12:00:00.000Z'));
    expect(isMembershipExpiredAt('2026-06-01T12:00:00.000Z')).toBe(false);
    expect(isMembershipExpiredAt('2026-07-01T12:00:00.000Z')).toBe(false);
    vi.useRealTimers();
  });

  it('aligns with hasValidMembership for a status object', () => {
    const past = '2020-01-01T00:00:00.000Z';
    const future = '2099-01-01T00:00:00.000Z';
    expect(isMembershipExpiredAt(past)).toBe(!hasValidMembership({ membership_expires_at: past }));
    expect(isMembershipExpiredAt(future)).toBe(
      !hasValidMembership({ membership_expires_at: future })
    );
  });
});
