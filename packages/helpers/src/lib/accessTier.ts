import type { MembershipState } from './accountMembership.js';

/**
 * The three access tiers every gated capability is assigned to. Gating is never a binary
 * "logged in or not" check: "requires an account" and "requires a valid paid membership" are
 * different requirements and must not be collapsed.
 *
 * Tier assignments are fixed by the `mobile-anonymous-vs-account-features` rule. The gate test is:
 * does the capability require a server-side write or a server-side job that must run? If yes it is
 * membership-tier unless assigned otherwise.
 */
export type AccessTier = 'anonymous' | 'account' | 'membership';

const ACCESS_TIER_RANK: Readonly<Record<AccessTier, number>> = {
  anonymous: 0,
  account: 1,
  membership: 2,
};

/**
 * Capabilities that clients gate on. Anonymous-tier entries are listed explicitly rather than
 * omitted so that a call site asking about them gets an `allowed` answer from the same evaluator,
 * instead of every screen re-deciding what counts as "local enough" to skip the check.
 */
export type GatedFeature =
  | 'add_by_rss_add'
  | 'add_by_rss_refresh'
  | 'add_by_rss_view'
  | 'directory_add_by_rss'
  | 'downloads'
  | 'notifications'
  | 'offline_playback'
  | 'queue_history_local'
  | 'queue_history_sync'
  | 'seen_state_local'
  | 'seen_state_sync'
  | 'subscribe_local'
  | 'subscribe_sync'
  | 'subscription_list'
  | 'unsubscribe';

export const FEATURE_REQUIRED_TIER: Readonly<Record<GatedFeature, AccessTier>> = {
  // Device-local: nothing reaches the server, so nothing to gate.
  subscribe_local: 'anonymous',
  unsubscribe: 'anonymous',
  subscription_list: 'anonymous',
  downloads: 'anonymous',
  offline_playback: 'anonymous',
  queue_history_local: 'anonymous',
  seen_state_local: 'anonymous',
  // A lapsed member keeps reading and playing feeds they already added; only refresh and add stop.
  add_by_rss_view: 'anonymous',
  // A server write, but not a paid capability.
  seen_state_sync: 'account',
  // Server writes or server-side jobs.
  subscribe_sync: 'membership',
  queue_history_sync: 'membership',
  add_by_rss_add: 'membership',
  add_by_rss_refresh: 'membership',
  notifications: 'membership',
  // Adding a feed to the public directory triggers server-side parsing. Membership tier is the
  // floor, not the whole answer: the server also applies per-tier capability flags a client cannot
  // predict (Trial cannot add to the directory), so a 403 is still possible after this allows.
  directory_add_by_rss: 'membership',
};

/**
 * Why a capability is unavailable. `limit_reached` only ever originates from a server 403 (a quota
 * the client cannot predict); the other three are resolvable from the account snapshot alone.
 */
export type AccessDenialReason =
  'limit_reached' | 'membership_expired' | 'needs_account' | 'needs_membership';

export type FeatureAccess =
  { allowed: true } | { allowed: false; reason: AccessDenialReason; requiredTier: AccessTier };

const ALLOWED: FeatureAccess = { allowed: true };

/**
 * A lapsed member is `account` tier, not a fourth state: they keep every anonymous- and
 * account-tier capability and lose only membership-tier ones.
 */
export function accessTierFromMembership(membership: MembershipState): AccessTier {
  if (!membership.isLoggedIn) {
    return 'anonymous';
  }
  return membership.isMember ? 'membership' : 'account';
}

export function accessTierSatisfies(actual: AccessTier, required: AccessTier): boolean {
  return ACCESS_TIER_RANK[actual] >= ACCESS_TIER_RANK[required];
}

/**
 * The single answer to "is this user's tier sufficient for this capability". Both surfaces resolve
 * gating through this rather than re-deriving it from auth state plus membership fields.
 *
 * A signed-out user hitting a membership-tier capability is told to sign in first, not to buy a
 * membership — there is no way to hold one without an account.
 *
 * `allowed: true` means "not blocked by tier", **not** "will succeed". Trial resolves to
 * `membership` tier, but the API blocks Trial accounts from some Premium capabilities and enforces
 * per-plan quotas. Those stay server-authoritative, so call sites must still handle a 403 (see
 * `accessDenialReasonFromGate` in `@podverse/helpers-requests`).
 */
export function evaluateFeatureAccess(
  feature: GatedFeature,
  membership: MembershipState
): FeatureAccess {
  const requiredTier = FEATURE_REQUIRED_TIER[feature];
  const tier = accessTierFromMembership(membership);

  if (accessTierSatisfies(tier, requiredTier)) {
    return ALLOWED;
  }

  if (!membership.isLoggedIn) {
    return { allowed: false, reason: 'needs_account', requiredTier };
  }

  return {
    allowed: false,
    reason: membership.isExpired ? 'membership_expired' : 'needs_membership',
    requiredTier,
  };
}

/**
 * Suppression of "membership expiring soon" reminders for auto-renewing users waits on payment
 * functionality. Every reminder surface calls this, so enabling it later is a change here and
 * nowhere else.
 *
 * Enabling it also has to settle which field is authoritative: the account membership status
 * carries both `auto_renew` and `auto_renew_mode`.
 */
export function shouldSuppressExpiryReminder(): boolean {
  return false;
}
