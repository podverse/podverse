import {
  DEFAULT_FREE_TRIAL_EXPIRATION,
  readOptionalPositiveExpirationEnv,
} from './parseEnvExpiration.js';
import { parseNonNegativeIntEnv, parseNonNegativeNumberEnv } from './parseEnvNonNegative.js';

const parseBooleanEnv = (name: string, fallback: boolean): boolean => {
  const raw = process.env[name];
  if (raw === undefined || raw === '') {
    return fallback;
  }

  return raw === 'true';
};

/** Bootstrap values from env (startup validation and seeding fresh databases). */
export type ProductMembershipDefaultsFromEnv = {
  freeTrialExpirationSeconds: number;
  premiumMembershipCostMonthly: number;
  premiumMembershipCostAnnually: number;
  trialAllowDirectoryAddByRSS: boolean;
  trialMaxAddByRSSFeeds: number;
  trialMaxManualRefreshesPerHour: number;
  trialTrackStats: boolean;
  trialAllowNotifications: boolean;
  premiumAllowDirectoryAddByRSS: boolean;
  premiumMaxAddByRSSFeeds: number;
  premiumMaxManualRefreshesPerHour: number;
  premiumTrackStats: boolean;
  premiumAllowNotifications: boolean;
};

/**
 * Effective product membership defaults after merging env, `product_membership_settings`
 * (trial length / caps), and active `billing_price` rows (premium USD prices).
 */
export type ResolvedProductMembership = {
  freeTrialExpirationSeconds: number;
  premiumMembershipCostMonthly: number;
  premiumMembershipCostAnnually: number;
  trialAllowDirectoryAddByRSS: boolean;
  trialMaxAddByRSSFeeds: number;
  trialMaxManualRefreshesPerHour: number;
  trialTrackStats: boolean;
  trialAllowNotifications: boolean;
  premiumAllowDirectoryAddByRSS: boolean;
  premiumMaxAddByRSSFeeds: number;
  premiumMaxManualRefreshesPerHour: number;
  premiumTrackStats: boolean;
  premiumAllowNotifications: boolean;
};

/** Membership defaults used for entitlement resolution. */
export type ProductMembershipEntitlementDefaults = Pick<
  ResolvedProductMembership,
  | 'trialAllowDirectoryAddByRSS'
  | 'trialMaxAddByRSSFeeds'
  | 'trialMaxManualRefreshesPerHour'
  | 'trialTrackStats'
  | 'trialAllowNotifications'
  | 'premiumAllowDirectoryAddByRSS'
  | 'premiumMaxAddByRSSFeeds'
  | 'premiumMaxManualRefreshesPerHour'
  | 'premiumTrackStats'
  | 'premiumAllowNotifications'
>;

/** Backward-compatible name for entitlement defaults used by existing callers. */
export type ProductMembershipCapDefaults = ProductMembershipEntitlementDefaults;

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
    trialAllowDirectoryAddByRSS: parseBooleanEnv(
      'MEMBERSHIP_TRIAL_ALLOW_DIRECTORY_ADD_BY_RSS',
      false
    ),
    trialMaxAddByRSSFeeds: parseNonNegativeIntEnv('MEMBERSHIP_TRIAL_MAX_ADD_BY_RSS_FEEDS', 10),
    trialMaxManualRefreshesPerHour: parseNonNegativeIntEnv(
      'MEMBERSHIP_TRIAL_MAX_MANUAL_REFRESHES_PER_HOUR',
      5
    ),
    trialTrackStats: parseBooleanEnv('MEMBERSHIP_TRIAL_TRACK_STATS', false),
    trialAllowNotifications: parseBooleanEnv('MEMBERSHIP_TRIAL_ALLOW_NOTIFICATIONS', false),
    premiumAllowDirectoryAddByRSS: parseBooleanEnv(
      'MEMBERSHIP_PREMIUM_ALLOW_DIRECTORY_ADD_BY_RSS',
      true
    ),
    premiumMaxAddByRSSFeeds: parseNonNegativeIntEnv('MEMBERSHIP_PREMIUM_MAX_ADD_BY_RSS_FEEDS', 100),
    premiumMaxManualRefreshesPerHour: parseNonNegativeIntEnv(
      'MEMBERSHIP_PREMIUM_MAX_MANUAL_REFRESHES_PER_HOUR',
      20
    ),
    premiumTrackStats: parseBooleanEnv('MEMBERSHIP_PREMIUM_TRACK_STATS', true),
    premiumAllowNotifications: parseBooleanEnv('MEMBERSHIP_PREMIUM_ALLOW_NOTIFICATIONS', true),
  };
}
