import { describe, expect, it } from 'vitest';

import type { AccessDenialReason } from '@podverse/helpers';

import {
  membershipGateConfirmDestination,
  membershipGateConfirmLabelKey,
  membershipGateConfirmTestID,
  membershipGateMessageKeys,
  membershipGateNoticeActionKey,
} from './membershipGateCopy';

const REASONS: AccessDenialReason[] = [
  'limit_reached',
  'membership_expired',
  'needs_account',
  'needs_membership',
];

describe('membershipGateMessageKeys', () => {
  it('returns expired title and body only for membership_expired', () => {
    expect(membershipGateMessageKeys('membership_expired')).toEqual({
      bodyKey: 'membership.gate.body_expired',
      titleKey: 'membership.gate.title_expired',
    });

    for (const reason of REASONS) {
      if (reason === 'membership_expired') {
        continue;
      }
      const keys = membershipGateMessageKeys(reason);
      expect(keys.titleKey).not.toBe('membership.gate.title_expired');
      expect(keys.bodyKey).not.toBe('membership.gate.body_expired');
    }
  });

  it('gives each denial its own title and body keys', () => {
    const titles = REASONS.map((reason) => membershipGateMessageKeys(reason).titleKey);
    const bodies = REASONS.map((reason) => membershipGateMessageKeys(reason).bodyKey);
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
    expect(membershipGateConfirmLabelKey('needs_account', false)).toBe('authentication.login');
    expect(membershipGateConfirmLabelKey('needs_account', true)).toBe('authentication.login');
  });

  it('uses renew or sign up from login state for every other denial', () => {
    expect(membershipGateConfirmLabelKey('needs_membership', true)).toBe('membership.gate.renew');
    expect(membershipGateConfirmLabelKey('needs_membership', false)).toBe(
      'membership.gate.sign_up'
    );
    expect(membershipGateConfirmLabelKey('membership_expired', true)).toBe('membership.gate.renew');
    expect(membershipGateConfirmLabelKey('limit_reached', false)).toBe('membership.gate.sign_up');
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
  it('maps each denial to an explicit notice action key', () => {
    expect(membershipGateNoticeActionKey('needs_account')).toBe('authentication.login');
    expect(membershipGateNoticeActionKey('membership_expired')).toBe('membership.gate.renew');
    expect(membershipGateNoticeActionKey('needs_membership')).toBe('membership.get_premium');
    expect(membershipGateNoticeActionKey('limit_reached')).toBe('membership.get_premium');
  });
});
