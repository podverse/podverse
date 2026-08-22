import { describe, expect, it, vi } from 'vitest';

import type { DTOAccount, DTOAccountMembershipStatus } from '../dtos/index.js';
import {
  AccountMembershipEnum,
  deriveMembershipState,
  hasValidMembership,
  isMembershipExpiredAt,
} from './accountMembership.js';

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

const FUTURE = new Date(Date.now() + 86_400_000).toISOString();
const PAST = new Date(Date.now() - 86_400_000).toISOString();

const makeStatus = (
  overrides: Partial<DTOAccountMembershipStatus>
): DTOAccountMembershipStatus => ({
  id: 1,
  account_id: 1,
  account_membership_id: AccountMembershipEnum.Premium,
  membership_expires_at: null,
  auto_renew: false,
  billing_cadence: null,
  auto_renew_mode: 'off',
  next_renewal_attempt_at: null,
  last_renewal_attempt_at: null,
  last_renewal_status: 'none',
  last_extension_idempotency_key: null,
  last_renewal_idempotency_key: null,
  renewal_retry_count: 0,
  renewal_retry_backoff_until: null,
  allow_directory_add_by_rss: null,
  max_add_by_rss_feeds: null,
  max_manual_refreshes_per_hour: null,
  track_stats: null,
  allow_notifications: null,
  ...overrides,
});

const makeAccount = (status?: DTOAccountMembershipStatus): DTOAccount => ({
  id: 1,
  id_text: 'acct-1',
  verified: true,
  ...(status !== undefined ? { account_membership_status: status } : {}),
});

describe('deriveMembershipState', () => {
  it('returns the logged-out state for a null account', () => {
    expect(deriveMembershipState(null)).toEqual({
      isLoggedIn: false,
      isMember: false,
      isExpired: false,
      tier: null,
      expiresAt: null,
    });
  });

  it('reports a valid premium membership', () => {
    const state = deriveMembershipState(
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Premium,
          membership_expires_at: FUTURE,
        })
      )
    );

    expect(state).toEqual({
      isLoggedIn: true,
      isMember: true,
      isExpired: false,
      tier: 'premium',
      expiresAt: FUTURE,
    });
  });

  it('reports an expired premium membership', () => {
    const state = deriveMembershipState(
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Premium,
          membership_expires_at: PAST,
        })
      )
    );

    expect(state.isLoggedIn).toBe(true);
    expect(state.isMember).toBe(false);
    expect(state.isExpired).toBe(true);
    expect(state.tier).toBe('premium');
    expect(state.expiresAt).toBe(PAST);
  });

  it('reports a valid trial membership', () => {
    const state = deriveMembershipState(
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Trial,
          membership_expires_at: FUTURE,
        })
      )
    );

    expect(state.isMember).toBe(true);
    expect(state.isExpired).toBe(false);
    expect(state.tier).toBe('trial');
  });

  it('treats a null expiry as not-a-member and not-expired', () => {
    const state = deriveMembershipState(
      makeAccount(
        makeStatus({
          account_membership_id: AccountMembershipEnum.Trial,
          membership_expires_at: null,
        })
      )
    );

    expect(state.isMember).toBe(false);
    expect(state.isExpired).toBe(false);
    expect(state.tier).toBe('trial');
    expect(state.expiresAt).toBeNull();
  });

  it('handles a logged-in account with no membership status', () => {
    const state = deriveMembershipState(makeAccount());

    expect(state).toEqual({
      isLoggedIn: true,
      isMember: false,
      isExpired: false,
      tier: null,
      expiresAt: null,
    });
  });

  it('reads the tier from a populated account_membership.id (web SSR shape)', () => {
    const state = deriveMembershipState({
      account_membership_status: {
        account_membership: { id: AccountMembershipEnum.Premium },
        membership_expires_at: FUTURE,
      },
    });

    expect(state.tier).toBe('premium');
    expect(state.isMember).toBe(true);
    expect(state.expiresAt).toBe(FUTURE);
  });
});
