import type { PremiumBillingCadence, ResolvedProductMembership } from '@podverse/helpers';
import {
  AccountMembershipEnum,
  DEFAULT_FREE_TRIAL_EXPIRATION,
  extendMembershipPeriodByCadence,
  getDefaultEntitlementsForMembershipTier,
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
    trialMaxAddByRSSFeeds: 10,
    trialMaxManualRefreshesPerHour: 5,
    premiumMaxAddByRSSFeeds: 100,
    premiumMaxManualRefreshesPerHour: 20,
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

export function tierLimitPlaceholders(
  product: ResolvedProductMembership,
  membershipId: number
): { rss: number; refresh: number } {
  if (membershipId === AccountMembershipEnum.Premium) {
    return {
      rss: product.premiumMaxAddByRSSFeeds,
      refresh: product.premiumMaxManualRefreshesPerHour,
    };
  }
  return {
    rss: product.trialMaxAddByRSSFeeds,
    refresh: product.trialMaxManualRefreshesPerHour,
  };
}

export function resolvedTierEntitlements(membershipId: number) {
  const tier =
    membershipId === AccountMembershipEnum.Premium
      ? AccountMembershipEnum.Premium
      : AccountMembershipEnum.Trial;
  return getDefaultEntitlementsForMembershipTier(tier);
}
