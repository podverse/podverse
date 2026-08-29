import type { AccessDenialReason } from '@podverse/helpers';
import {
  accessDenialReasonFromGate,
  membershipDenialReason,
  parseMembershipGateError,
} from '@podverse/helpers-requests';

/**
 * `reason` selects only the modal/banner **body copy** — the renew/sign-up button label is auth-based
 * (`isLoggedIn`), decided at the call site, not here.
 *
 * The reason is the shared `AccessDenialReason` from `@podverse/helpers`, the same vocabulary
 * `useAccessTier` produces for client-side checks, so a screen renders one set of denial states
 * whether the answer came from the account snapshot or from the server.
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
