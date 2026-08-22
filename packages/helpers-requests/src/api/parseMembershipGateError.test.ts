import { describe, expect, it } from 'vitest';

import {
  MEMBERSHIP_GATE_I18N_KEYS,
  membershipDenialReason,
  parseMembershipGateError,
} from './parseMembershipGateError.js';

function errorWith(status: number, data: unknown): unknown {
  return Object.assign(new Error('Request failed'), { response: { status, data } });
}

describe('parseMembershipGateError', () => {
  it('parses an expired-membership 403', () => {
    const parsed = parseMembershipGateError(
      errorWith(403, {
        message: 'Your membership has expired. Renew to use this feature.',
        code: 'membership_expired',
        i18nKey: 'membership.membership_expired',
        renewPath: '/membership/renew',
      })
    );

    expect(parsed).toEqual({
      code: 'membership_expired',
      i18nKey: 'membership.membership_expired',
      message: 'Your membership has expired. Renew to use this feature.',
      renewPath: '/membership/renew',
    });
  });

  it('parses a feature-not-available (insufficient tier) 403', () => {
    const parsed = parseMembershipGateError(
      errorWith(403, {
        message: 'Your account does not currently have access to this feature.',
        code: 'feature_not_available_for_account_type',
        i18nKey: 'membership.feature_not_available_for_account_type',
        renewPath: '/membership/renew',
      })
    );

    expect(parsed?.i18nKey).toBe('membership.feature_not_available_for_account_type');
    expect(parsed?.code).toBe('feature_not_available_for_account_type');
    expect(parsed?.renewPath).toBe('/membership/renew');
  });

  it('parses a limit-reached 403 and tolerates a missing renewPath/message', () => {
    const parsed = parseMembershipGateError(
      errorWith(403, {
        code: 'add_by_rss_feed_limit_reached',
        i18nKey: 'membership.add_by_rss_feed_limit_reached',
      })
    );

    expect(parsed).toEqual({
      code: 'add_by_rss_feed_limit_reached',
      i18nKey: 'membership.add_by_rss_feed_limit_reached',
      message: undefined,
      renewPath: undefined,
    });
  });

  it('returns null for non-membership 403s, non-403s, and malformed errors', () => {
    expect(parseMembershipGateError(errorWith(403, { message: 'Forbidden' }))).toBeNull();
    expect(parseMembershipGateError(errorWith(403, { i18nKey: 'auth.unauthorized' }))).toBeNull();
    expect(
      parseMembershipGateError(errorWith(401, { i18nKey: 'membership.membership_expired' }))
    ).toBeNull();
    expect(parseMembershipGateError(errorWith(403, null))).toBeNull();
    expect(parseMembershipGateError(new Error('boom'))).toBeNull();
    expect(parseMembershipGateError(undefined)).toBeNull();
  });
});

describe('membershipDenialReason', () => {
  it('maps the expired key to `expired`', () => {
    expect(membershipDenialReason(MEMBERSHIP_GATE_I18N_KEYS.expired)).toBe('expired');
  });

  it('maps the feature-not-available key to `insufficient_tier`', () => {
    expect(membershipDenialReason(MEMBERSHIP_GATE_I18N_KEYS.featureNotAvailable)).toBe(
      'insufficient_tier'
    );
  });

  it('maps limit keys (and any other membership.* key) to `limit`', () => {
    expect(membershipDenialReason('membership.add_by_rss_feed_limit_reached')).toBe('limit');
    expect(membershipDenialReason('membership.manual_refresh_hourly_limit_reached')).toBe('limit');
    expect(membershipDenialReason('membership.some_future_limit')).toBe('limit');
  });
});
