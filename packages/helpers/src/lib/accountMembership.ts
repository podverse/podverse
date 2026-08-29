import { ONE_DAY_MS } from './timeConstants.js';

export enum AccountMembershipEnum {
  Trial = 1,
  Premium = 2,
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

type MembershipExpiresAtInput = Date | string | null | undefined;

/**
 * True when `membership_expires_at` is set and strictly before the current instant.
 * Null/undefined means "no expiry timestamp" (not treated as expired).
 */
export function isMembershipExpiredAt(membershipExpiresAt: MembershipExpiresAtInput): boolean {
  if (membershipExpiresAt === null || membershipExpiresAt === undefined) {
    return false;
  }

  return !hasValidMembership({ membership_expires_at: membershipExpiresAt });
}

/**
 * How long before expiry the user starts being told, in days. Every surface derives this on demand
 * from the account snapshot it already holds, so warning the user costs a date comparison. See the
 * rule `no-membership-expiry-notifications`.
 */
export const MEMBERSHIP_EXPIRY_WARNING_DAYS = 14;


export type MembershipExpiryStatus = 'none' | 'expiring_soon' | 'expired';

export interface MembershipExpiryNotice {
  status: MembershipExpiryStatus;
  /** Whole days until expiry, rounded up. Null when there is no expiry to count down to. */
  daysRemaining: number | null;
}

const NO_EXPIRY_NOTICE: MembershipExpiryNotice = { status: 'none', daysRemaining: null };

/**
 * Classifies a membership as expired, expiring soon, or neither, from the snapshot the caller
 * already holds. Shared so web and mobile use one window rather than each picking a number.
 *
 * Callers layer their own suppression on top (for example auto-renew enrollment, or a dismissal the
 * user made); this function only answers where the expiry sits relative to now.
 */
export function getMembershipExpiryNotice(
  membership: MembershipState,
  now: Date = new Date()
): MembershipExpiryNotice {
  if (!membership.isLoggedIn || membership.expiresAt === null) {
    return NO_EXPIRY_NOTICE;
  }

  const expiresAt = new Date(membership.expiresAt);
  if (Number.isNaN(expiresAt.getTime())) {
    return NO_EXPIRY_NOTICE;
  }

  const remainingMs = expiresAt.getTime() - now.getTime();
  if (remainingMs <= 0) {
    return { status: 'expired', daysRemaining: 0 };
  }

  const daysRemaining = Math.ceil(remainingMs / ONE_DAY_MS);
  if (daysRemaining > MEMBERSHIP_EXPIRY_WARNING_DAYS) {
    return { status: 'none', daysRemaining };
  }

  return { status: 'expiring_soon', daysRemaining };
}

export type MembershipTier = 'trial' | 'premium';

/** Normalized membership snapshot shared by every JS client surface (web + mobile/tablet RN). */
export interface MembershipState {
  isLoggedIn: boolean;
  isMember: boolean;
  isExpired: boolean;
  tier: MembershipTier | null;
  expiresAt: string | null;
}

// Permissive input: the DTO exposes `account_membership_id`; some SSR/populated payloads expose the
// membership id under `account_membership.id`. Accept both without a type assertion.
type MembershipStatusInput =
  | {
      account_membership_id?: number;
      account_membership?: { id?: number };
      membership_expires_at?: Date | string | null;
    }
  | null
  | undefined;

type AccountLike = { account_membership_status?: MembershipStatusInput } | null | undefined;

function tierFromMembershipId(membershipId: number | undefined): MembershipTier | null {
  if (membershipId === AccountMembershipEnum.Premium) {
    return 'premium';
  }
  if (membershipId === AccountMembershipEnum.Trial) {
    return 'trial';
  }
  return null;
}

/**
 * Pure derivation of the current user's membership state from the `/auth/me` account snapshot. Shared
 * by web and mobile so the surfaces cannot drift. The renew/sign-up button label at call sites is
 * auth-based (`isLoggedIn`); `isExpired` / `tier` drive banner + message copy only.
 */
export function deriveMembershipState(account: AccountLike): MembershipState {
  if (account === null || account === undefined) {
    return { isLoggedIn: false, isMember: false, isExpired: false, tier: null, expiresAt: null };
  }

  const status = account.account_membership_status ?? null;
  const membershipId = status?.account_membership_id ?? status?.account_membership?.id;
  const rawExpiresAt = status?.membership_expires_at ?? null;

  return {
    isLoggedIn: true,
    isMember: hasValidMembership(status),
    isExpired: isMembershipExpiredAt(rawExpiresAt),
    tier: tierFromMembershipId(membershipId),
    expiresAt: typeof rawExpiresAt === 'string' ? rawExpiresAt : null,
  };
}
