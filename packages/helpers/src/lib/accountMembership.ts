export enum AccountMembershipEnum {
  Trial = 1,
  Basic = 2,
}

type MembershipStatusLike =
  | {
      membership_expires_at?: Date | string | null;
    }
  | null
  | undefined;

/**
 * Checks if a membership status is valid and not expired.
 * A membership is valid if:
 * - The membership status exists
 * - membership_expires_at is not null
 * - membership_expires_at is in the future (>= current date)
 *
 * @param membershipStatus - The membership status object (can be null/undefined)
 * @returns true if the membership is valid and not expired, false otherwise
 */
export function hasValidMembership(membershipStatus: MembershipStatusLike): boolean {
  if (!membershipStatus || !membershipStatus.membership_expires_at) {
    return false;
  }

  const expirationDate =
    typeof membershipStatus.membership_expires_at === 'string'
      ? new Date(membershipStatus.membership_expires_at)
      : membershipStatus.membership_expires_at;

  return expirationDate >= new Date();
}
