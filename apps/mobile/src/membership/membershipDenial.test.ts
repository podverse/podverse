import { describe, expect, it } from 'vitest';

import { mapMembershipDenial } from './membershipDenial';

const gate403 = (i18nKey: string, renewPath?: string): unknown =>
  Object.assign(new Error('Request failed'), {
    response: { status: 403, data: { i18nKey, ...(renewPath !== undefined ? { renewPath } : {}) } },
  });

describe('mapMembershipDenial', () => {
  it('maps an expired-membership 403', () => {
    expect(
      mapMembershipDenial(gate403('membership.membership_expired', '/membership/renew'))
    ).toEqual({
      reason: 'membership_expired',
      i18nKey: 'membership.membership_expired',
      renewPath: '/membership/renew',
    });
  });

  it('maps a feature-not-available 403 to needs_membership, never needs_account', () => {
    const denial = mapMembershipDenial(
      gate403('membership.feature_not_available_for_account_type')
    );

    expect(denial?.reason).toBe('needs_membership');
    expect(denial?.i18nKey).toBe('membership.feature_not_available_for_account_type');
    expect(denial?.renewPath).toBeUndefined();
  });

  it('maps the add-by-RSS and manual-refresh limit 403s to limit_reached', () => {
    expect(mapMembershipDenial(gate403('membership.add_by_rss_feed_limit_reached'))?.reason).toBe(
      'limit_reached'
    );
    expect(
      mapMembershipDenial(gate403('membership.manual_refresh_hourly_limit_reached'))?.reason
    ).toBe('limit_reached');
  });

  it('returns null for non-membership errors', () => {
    expect(mapMembershipDenial(gate403('auth.unauthorized'))).toBeNull();
    expect(mapMembershipDenial(new Error('boom'))).toBeNull();
  });
});
