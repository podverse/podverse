import { describe, expect, it } from 'vitest';

import type { AccessDenialReason, MembershipTier } from '@podverse/helpers';

import {
  followLimitDialogCopy,
  membershipGateConfirmDestination,
  membershipGateConfirmLabelKey,
  membershipGateConfirmTestID,
  membershipGateConfirmVariant,
  membershipGateMessageKeys,
  membershipGateNoticeActionKey,
} from './membershipGateCopy';

const REASONS: AccessDenialReason[] = [
  'limit_reached',
  'membership_expired',
  'needs_account',
  'needs_membership',
];

const signedOut = { isLoggedIn: false, tier: null };
const trial: { isLoggedIn: true; tier: MembershipTier } = { isLoggedIn: true, tier: 'trial' };
const premium: { isLoggedIn: true; tier: MembershipTier } = { isLoggedIn: true, tier: 'premium' };

describe('followLimitDialogCopy', () => {
  it('asks for the follow-limit sentence and no renew action', () => {
    expect(followLimitDialogCopy(500)).toEqual({
      bodyKey: 'membership.follow_limit_reached',
      bodyValues: { limit: 500 },
      titleKey: 'membership.gate.title_limit',
    });
  });
});

describe('membershipGateMessageKeys', () => {
  it('returns the trial expired body unless the tier is premium', () => {
    expect(membershipGateMessageKeys('membership_expired', 'trial')).toEqual({
      bodyKey: 'membership.gate.body_expired_trial',
      titleKey: 'membership.gate.title_expired',
    });
    expect(membershipGateMessageKeys('membership_expired', null).bodyKey).toBe(
      'membership.gate.body_expired_trial'
    );
    expect(membershipGateMessageKeys('membership_expired', 'premium')).toEqual({
      bodyKey: 'membership.gate.body_expired_premium',
      titleKey: 'membership.gate.title_expired',
    });

    for (const reason of REASONS) {
      if (reason === 'membership_expired') {
        continue;
      }
      const keys = membershipGateMessageKeys(reason, 'premium');
      expect(keys.titleKey).not.toBe('membership.gate.title_expired');
      expect(keys.bodyKey).not.toBe('membership.gate.body_expired_premium');
      expect(keys.bodyKey).not.toBe('membership.gate.body_expired_trial');
    }
  });

  it('gives each denial its own title and body keys', () => {
    const titles = REASONS.map((reason) => membershipGateMessageKeys(reason, null).titleKey);
    const bodies = REASONS.map((reason) => membershipGateMessageKeys(reason, null).bodyKey);
    expect(new Set(titles).size).toBe(REASONS.length);
    expect(new Set(bodies).size).toBe(REASONS.length);
  });
});

describe('membershipGateConfirmDestination', () => {
  it('sends needs_account to login and every other denial to membership', () => {
    expect(membershipGateConfirmDestination('needs_account')).toBe('login');
    expect(membershipGateConfirmDestination('limit_reached')).toBe('membership');
    expect(membershipGateConfirmDestination('membership_expired')).toBe('membership');
    expect(membershipGateConfirmDestination('needs_membership')).toBe('membership');
  });
});

describe('membershipGateConfirmLabelKey', () => {
  it('uses login only for needs_account', () => {
    expect(membershipGateConfirmLabelKey('needs_account', signedOut)).toBe('authentication.login');
    expect(membershipGateConfirmLabelKey('needs_account', premium)).toBe('authentication.login');
  });

  it('uses extend for premium and buy for trial, including when the membership is expired', () => {
    expect(membershipGateConfirmLabelKey('membership_expired', premium)).toBe(
      'membership.extend_my_membership'
    );
    expect(membershipGateConfirmLabelKey('membership_expired', trial)).toBe(
      'membership.buy_membership'
    );
    expect(membershipGateConfirmLabelKey('needs_membership', premium)).toBe(
      'membership.extend_my_membership'
    );
    expect(membershipGateConfirmLabelKey('needs_membership', trial)).toBe(
      'membership.buy_membership'
    );
    expect(membershipGateConfirmLabelKey('limit_reached', signedOut)).toBe(
      'membership.gate.sign_up'
    );
  });
});

describe('membershipGateConfirmVariant', () => {
  it('uses success for Buy Membership and Extend Membership, and primary for Login and Sign Up', () => {
    expect(membershipGateConfirmVariant('needs_account', signedOut)).toBe('primary');
    expect(membershipGateConfirmVariant('needs_account', premium)).toBe('primary');
    expect(membershipGateConfirmVariant('limit_reached', signedOut)).toBe('primary');
    expect(membershipGateConfirmVariant('membership_expired', premium)).toBe('success');
    expect(membershipGateConfirmVariant('membership_expired', trial)).toBe('success');
    expect(membershipGateConfirmVariant('needs_membership', premium)).toBe('success');
    expect(membershipGateConfirmVariant('needs_membership', trial)).toBe('success');
    expect(membershipGateConfirmVariant('limit_reached', premium)).toBe('success');
  });
});

describe('membershipGateConfirmTestID', () => {
  it('uses the login test id only for needs_account', () => {
    expect(membershipGateConfirmTestID('needs_account')).toBe('premium-gate-login');
    expect(membershipGateConfirmTestID('needs_membership')).toBe('premium-gate-renew');
    expect(membershipGateConfirmTestID('membership_expired')).toBe('premium-gate-renew');
    expect(membershipGateConfirmTestID('limit_reached')).toBe('premium-gate-renew');
  });
});

describe('membershipGateNoticeActionKey', () => {
  it('uses the same purchase labels as the modal', () => {
    expect(membershipGateNoticeActionKey('needs_account', signedOut)).toBe('authentication.login');
    expect(membershipGateNoticeActionKey('membership_expired', premium)).toBe(
      'membership.extend_my_membership'
    );
    expect(membershipGateNoticeActionKey('membership_expired', trial)).toBe(
      'membership.buy_membership'
    );
    expect(membershipGateNoticeActionKey('needs_membership', trial)).toBe(
      'membership.buy_membership'
    );
    expect(membershipGateNoticeActionKey('limit_reached', premium)).toBe(
      'membership.extend_my_membership'
    );
  });
});
