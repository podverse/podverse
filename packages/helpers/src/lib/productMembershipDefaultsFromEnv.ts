import {
  DEFAULT_FREE_TRIAL_EXPIRATION,
  readOptionalPositiveExpirationEnv,
} from './parseEnvExpiration.js';
import { parseNonNegativeIntEnv, parseNonNegativeNumberEnv } from './parseEnvNonNegative.js';

/** Bootstrap values from env (startup validation and seeding fresh databases). */
export type ProductMembershipDefaultsFromEnv = {
  freeTrialExpirationSeconds: number;
  premiumMembershipCostMonthly: number;
  premiumMembershipCostAnnually: number;
  trialMaxAddByRSSFeeds: number;
  trialMaxManualRefreshesPerHour: number;
  premiumMaxAddByRSSFeeds: number;
  premiumMaxManualRefreshesPerHour: number;
};

/**
 * Effective product membership numbers after merging env, `product_membership_settings` (trial
 * length), and active `billing_price` rows (premium USD prices). RSS / refresh caps remain env-only
 * until persisted elsewhere.
 */
export type ResolvedProductMembership = {
  freeTrialExpirationSeconds: number;
  premiumMembershipCostMonthly: number;
  premiumMembershipCostAnnually: number;
  trialMaxAddByRSSFeeds: number;
  trialMaxManualRefreshesPerHour: number;
  premiumMaxAddByRSSFeeds: number;
  premiumMaxManualRefreshesPerHour: number;
};

/**
 * Read membership marketing / limit defaults from `process.env` using the same keys and fallbacks
 * as main-app account entitlements and premium config.
 */
export function resolveProductMembershipDefaultsFromEnv(): ProductMembershipDefaultsFromEnv {
  return {
    freeTrialExpirationSeconds: readOptionalPositiveExpirationEnv(
      'MEMBERSHIP_FREE_TRIAL_EXPIRATION',
      DEFAULT_FREE_TRIAL_EXPIRATION
    ),
    premiumMembershipCostMonthly: parseNonNegativeNumberEnv('MEMBERSHIP_PREMIUM_COST_MONTHLY', 3),
    premiumMembershipCostAnnually: parseNonNegativeNumberEnv(
      'MEMBERSHIP_PREMIUM_COST_ANNUALLY',
      30
    ),
    trialMaxAddByRSSFeeds: parseNonNegativeIntEnv('MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS', 10),
    trialMaxManualRefreshesPerHour: parseNonNegativeIntEnv(
      'MEMBERSHIP_TRIAL_MAX_MANUAL_REFRESHES_PER_HOUR',
      5
    ),
    premiumMaxAddByRSSFeeds: parseNonNegativeIntEnv('MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS', 100),
    premiumMaxManualRefreshesPerHour: parseNonNegativeIntEnv(
      'MEMBERSHIP_PREMIUM_MAX_MANUAL_REFRESHES_PER_HOUR',
      20
    ),
  };
}
