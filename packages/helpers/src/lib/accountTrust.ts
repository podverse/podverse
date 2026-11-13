import { AccountMembershipEnum } from './accountMembership.js';

export type AccountEntitlementCapability =
  | 'allowDirectoryAddByRSS'
  | 'maxAddByRSSFeeds'
  | 'maxManualRefreshesPerHour'
  | 'trackStats'
  | 'allowNotifications';

/**
 * Canonical values for `requiredCapability` and `accountHasCapability` (import these instead of string literals).
 */
export const ACCOUNT_ENTITLEMENT_CAPABILITY = {
  allowDirectoryAddByRSS: 'allowDirectoryAddByRSS',
  maxAddByRSSFeeds: 'maxAddByRSSFeeds',
  maxManualRefreshesPerHour: 'maxManualRefreshesPerHour',
  trackStats: 'trackStats',
  allowNotifications: 'allowNotifications',
} as const satisfies {
  readonly [K in AccountEntitlementCapability]: K;
};

export type AccountTrustEntitlements = {
  allowDirectoryAddByRSS: boolean;
  maxAddByRSSFeeds: number;
  maxManualRefreshesPerHour: number;
  trackStats: boolean;
  allowNotifications: boolean;
};

export type AccountTrustOverrides = {
  allow_directory_add_by_rss?: boolean | null;
  max_add_by_rss_feeds?: number | null;
  max_manual_refreshes_per_hour?: number | null;
  track_stats?: boolean | null;
  allow_notifications?: boolean | null;
};

/** Trial and Premium share this Add by RSS limit; a per-account override wins over it. */
export const DEFAULT_MAX_ADD_BY_RSS_FEEDS = 100;

export const DEFAULT_UNTRUSTED_ACCOUNT_ENTITLEMENTS: AccountTrustEntitlements = {
  allowDirectoryAddByRSS: false,
  maxAddByRSSFeeds: DEFAULT_MAX_ADD_BY_RSS_FEEDS,
  maxManualRefreshesPerHour: 5,
  trackStats: false,
  allowNotifications: true,
};

export const DEFAULT_TRUSTED_ACCOUNT_ENTITLEMENTS: AccountTrustEntitlements = {
  allowDirectoryAddByRSS: true,
  maxAddByRSSFeeds: DEFAULT_MAX_ADD_BY_RSS_FEEDS,
  maxManualRefreshesPerHour: 20,
  trackStats: true,
  allowNotifications: true,
};

export const getDefaultEntitlementsForMembershipTier = (
  membershipId: AccountMembershipEnum
): AccountTrustEntitlements => {
  if (membershipId === AccountMembershipEnum.Premium) {
    return DEFAULT_TRUSTED_ACCOUNT_ENTITLEMENTS;
  }

  return DEFAULT_UNTRUSTED_ACCOUNT_ENTITLEMENTS;
};

export const resolveAccountEntitlements = (
  membershipId: AccountMembershipEnum,
  overrides: AccountTrustOverrides | null | undefined,
  tierDefaults?: AccountTrustEntitlements
): AccountTrustEntitlements => {
  const defaults = tierDefaults ?? getDefaultEntitlementsForMembershipTier(membershipId);

  return {
    allowDirectoryAddByRSS:
      overrides?.allow_directory_add_by_rss ?? defaults.allowDirectoryAddByRSS,
    maxAddByRSSFeeds: overrides?.max_add_by_rss_feeds ?? defaults.maxAddByRSSFeeds,
    maxManualRefreshesPerHour:
      overrides?.max_manual_refreshes_per_hour ?? defaults.maxManualRefreshesPerHour,
    trackStats: overrides?.track_stats ?? defaults.trackStats,
    allowNotifications: overrides?.allow_notifications ?? defaults.allowNotifications,
  };
};

/**
 * A valid trial stores listens for the Taste Profile. A premium account stores them only while
 * `trackStats` is on.
 */
export const membershipStoresListens = (
  membershipId: AccountMembershipEnum,
  trackStats: boolean
): boolean => membershipId === AccountMembershipEnum.Trial || trackStats;

/**
 * Popularity rankings count a listen or an open only for a premium account with `trackStats` on.
 * A trial never counts, including when `trackStats` is forced on.
 */
export const membershipCountsTowardPopularity = (
  membershipId: AccountMembershipEnum,
  trackStats: boolean
): boolean => membershipId === AccountMembershipEnum.Premium && trackStats;
