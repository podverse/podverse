import type { AccessDenialReason } from '@podverse/helpers';

export type MembershipGateConfirmDestination = 'login' | 'membership';

export type MembershipGateMessageKeys = {
  bodyKey: string;
  titleKey: string;
};

/**
 * Reason → modal/notice i18n keys. Every denial has its own pair. There is no default branch.
 */
export function membershipGateMessageKeys(reason: AccessDenialReason): MembershipGateMessageKeys {
  switch (reason) {
    case 'limit_reached':
      return {
        bodyKey: 'membership.gate.body_limit',
        titleKey: 'membership.gate.title_limit',
      };
    case 'membership_expired':
      return {
        bodyKey: 'membership.gate.body_expired',
        titleKey: 'membership.gate.title_expired',
      };
    case 'needs_account':
      return {
        bodyKey: 'membership.gate.body_needs_account',
        titleKey: 'membership.gate.title_needs_account',
      };
    case 'needs_membership':
      return {
        bodyKey: 'membership.gate.body_premium',
        titleKey: 'membership.gate.title_premium',
      };
  }
}

/**
 * Confirm control on the shared gate modal. `needs_account` is Login; every other reason uses the
 * auth-based Membership CTA (renew when logged in, sign up when not).
 */
export function membershipGateConfirmLabelKey(
  reason: AccessDenialReason,
  isLoggedIn: boolean
): string {
  switch (reason) {
    case 'needs_account':
      return 'authentication.login';
    case 'limit_reached':
    case 'membership_expired':
    case 'needs_membership':
      return isLoggedIn ? 'membership.gate.renew' : 'membership.gate.sign_up';
  }
}

export function membershipGateConfirmTestID(reason: AccessDenialReason): string {
  switch (reason) {
    case 'needs_account':
      return 'premium-gate-login';
    case 'limit_reached':
    case 'membership_expired':
    case 'needs_membership':
      return 'premium-gate-renew';
  }
}

export function membershipGateConfirmDestination(
  reason: AccessDenialReason
): MembershipGateConfirmDestination {
  switch (reason) {
    case 'needs_account':
      return 'login';
    case 'limit_reached':
    case 'membership_expired':
    case 'needs_membership':
      return 'membership';
  }
}

/**
 * Primary action on the inline notice. Same destinations as the modal; labels match the notice
 * surface (`get_premium` for membership/limit, renew for expired).
 */
export function membershipGateNoticeActionKey(reason: AccessDenialReason): string {
  switch (reason) {
    case 'needs_account':
      return 'authentication.login';
    case 'membership_expired':
      return 'membership.gate.renew';
    case 'limit_reached':
    case 'needs_membership':
      return 'membership.get_premium';
  }
}
