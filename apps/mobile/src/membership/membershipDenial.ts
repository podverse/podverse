import type { MembershipDenialReason } from '@podverse/helpers-requests';
import { membershipDenialReason, parseMembershipGateError } from '@podverse/helpers-requests';

/**
 * `reason` (from the shared `membershipDenialReason`, keyed off the API 403 `i18nKey`) selects only the
 * modal/banner **body copy** — the renew/sign-up button label is auth-based (`isLoggedIn`), decided at
 * the call site, not here. Web and mobile share the same categoriser so the surfaces cannot drift.
 */
export type { MembershipDenialReason };

export interface MembershipDenial {
  reason: MembershipDenialReason;
  i18nKey: string;
  renewPath?: string;
}

/**
 * Maps a thrown API error to a {@link MembershipDenial} via the shared `parseMembershipGateError`
 * parser + `membershipDenialReason` categoriser, or `null` when it is not a membership-gate 403.
 */
export const mapMembershipDenial = (error: unknown): MembershipDenial | null => {
  const parsed = parseMembershipGateError(error);
  if (parsed === null) {
    return null;
  }

  return {
    reason: membershipDenialReason(parsed.i18nKey),
    i18nKey: parsed.i18nKey,
    ...(parsed.renewPath !== undefined ? { renewPath: parsed.renewPath } : {}),
  };
};
