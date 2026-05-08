import type {
  AccountTrustEntitlements,
  AccountTrustOverrides,
  PremiumBillingCadence,
  ResolvedProductMembership,
} from '@podverse/helpers';
import {
  AccountMembershipEnum,
  DEFAULT_FREE_TRIAL_EXPIRATION,
  extendMembershipPeriodByCadence,
  hasValidMembership,
  resolveAccountEntitlements,
  toDatetimeLocalInputValue,
} from '@podverse/helpers';

export const STORAGE_EXPIRY_KEY = 'podverse-mgmt-create-user-membership-expires-at';
export const STORAGE_CADENCE_KEY = 'podverse-mgmt-create-user-premium-cadence';

/**
 * Client-side fallbacks when management-api is unreachable; matches
 * `resolveProductMembershipDefaultsFromEnv` bootstrap numbers in `@podverse/helpers`.
 */
export function fallbackProductMembershipFromEnv(): ResolvedProductMembership {
  return {
    freeTrialExpirationSeconds: DEFAULT_FREE_TRIAL_EXPIRATION,
    premiumMembershipCostMonthly: 3,
    premiumMembershipCostAnnually: 30,
    trialAllowDirectoryAddByRSS: false,
    trialMaxAddByRSSFeeds: 10,
    trialMaxManualRefreshesPerHour: 5,
    trialTrackStats: false,
    trialAllowNotifications: false,
    premiumAllowDirectoryAddByRSS: true,
    premiumMaxAddByRSSFeeds: 100,
    premiumMaxManualRefreshesPerHour: 20,
    premiumTrackStats: true,
    premiumAllowNotifications: true,
  };
}

export function computeDefaultExpiryInput(params: {
  membershipId: number;
  premiumCadence: PremiumBillingCadence;
  trialExpirationSeconds: number;
}): string {
  const now = new Date();
  if (params.membershipId === AccountMembershipEnum.Premium) {
    const d = extendMembershipPeriodByCadence({
      membershipExpiresAt: null,
      cadence: params.premiumCadence,
      now,
    });
    return toDatetimeLocalInputValue(d);
  }
  const sec =
    params.trialExpirationSeconds > 0
      ? params.trialExpirationSeconds
      : DEFAULT_FREE_TRIAL_EXPIRATION;
  return toDatetimeLocalInputValue(new Date(now.getTime() + sec * 1000));
}

function normalizedMembershipTier(membershipId: number): AccountMembershipEnum {
  return membershipId === AccountMembershipEnum.Premium
    ? AccountMembershipEnum.Premium
    : AccountMembershipEnum.Trial;
}

const BLOCKED_ACCOUNT_ENTITLEMENTS: AccountTrustEntitlements = {
  allowDirectoryAddByRSS: false,
  maxAddByRSSFeeds: 0,
  maxManualRefreshesPerHour: 0,
  trackStats: false,
  allowNotifications: false,
};

export function resolvedTierEntitlements(
  product: ResolvedProductMembership,
  membershipId: number
): AccountTrustEntitlements {
  const tier = normalizedMembershipTier(membershipId);
  if (tier === AccountMembershipEnum.Premium) {
    return {
      allowDirectoryAddByRSS: product.premiumAllowDirectoryAddByRSS,
      maxAddByRSSFeeds: product.premiumMaxAddByRSSFeeds,
      maxManualRefreshesPerHour: product.premiumMaxManualRefreshesPerHour,
      trackStats: product.premiumTrackStats,
      allowNotifications: product.premiumAllowNotifications,
    };
  }

  return {
    allowDirectoryAddByRSS: product.trialAllowDirectoryAddByRSS,
    maxAddByRSSFeeds: product.trialMaxAddByRSSFeeds,
    maxManualRefreshesPerHour: product.trialMaxManualRefreshesPerHour,
    trackStats: product.trialTrackStats,
    allowNotifications: product.trialAllowNotifications,
  };
}

export function resolveAdvancedOverrideDefaults(params: {
  product: ResolvedProductMembership;
  membershipId: number;
  membershipExpiresAt: string | null;
  overrides?: AccountTrustOverrides | null;
}): AccountTrustEntitlements {
  if (!hasValidMembership({ membership_expires_at: params.membershipExpiresAt })) {
    return BLOCKED_ACCOUNT_ENTITLEMENTS;
  }

  const tier = normalizedMembershipTier(params.membershipId);
  return resolveAccountEntitlements(
    tier,
    params.overrides,
    resolvedTierEntitlements(params.product, tier)
  );
}

export function tierLimitPlaceholders(params: {
  product: ResolvedProductMembership;
  membershipId: number;
  membershipExpiresAt: string | null;
}): { rss: number; refresh: number } {
  const defaults = resolveAdvancedOverrideDefaults({
    product: params.product,
    membershipId: params.membershipId,
    membershipExpiresAt: params.membershipExpiresAt,
  });

  return {
    rss: defaults.maxAddByRSSFeeds,
    refresh: defaults.maxManualRefreshesPerHour,
  };
}
