import type { AccessDenialReason } from '@podverse/helpers';
import {
  accessDenialReasonFromGate,
  membershipDenialReason,
  parseMembershipGateError,
} from '@podverse/helpers-requests';

/**
 * Shared `AccessDenialReason` from a membership 403. Modal title, body, and confirm labels live in
 * `membershipGateCopy`. The same reason vocabulary is what `useAccessTier` produces client-side.
 */
export interface MembershipDenial {
  reason: AccessDenialReason;
  i18nKey: string;
  renewPath?: string;
}

/**
 * Maps a thrown API error to a {@link MembershipDenial}, or `null` when it is not a membership-gate
 * 403. A 403 never yields `needs_account`: the request carried credentials.
 */
export const mapMembershipDenial = (error: unknown): MembershipDenial | null => {
  const parsed = parseMembershipGateError(error);
  if (parsed === null) {
    return null;
  }

  return {
    reason: accessDenialReasonFromGate(membershipDenialReason(parsed.i18nKey)),
    i18nKey: parsed.i18nKey,
    ...(parsed.renewPath !== undefined ? { renewPath: parsed.renewPath } : {}),
  };
};
